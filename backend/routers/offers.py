from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.clients import Client
from models.offers import ClientOfferRecommendation, OfferSimulation
from response import error, success
from schemas.offers import OfferSimulationIn, OfferStatusUpdateIn

from services.offer_engine import (
    extract_client_patterns,
    call_gemini_offers,
    fallback_offers,
    simulate_offer,
)


router = APIRouter(prefix="/offers", tags=["offers"])


def _serialize_offer(o: ClientOfferRecommendation) -> dict:
    details = o.offer_details or {}
    return {
        "id": str(o.id),
        "client_id": str(o.client_id),
        "offer_type": o.offer_type,
        "offer_details": details,
        "headline": details.get("headline") or details.get("title"),
        "client_pitch": details.get("client_pitch") or details.get("description"),
        "supplier_benefit": details.get("supplier_benefit"),
        "reasoning": o.reasoning,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _has_marketing_copy(o: ClientOfferRecommendation) -> bool:
    details = o.offer_details or {}
    return all(
        isinstance(details.get(key), str) and (details.get(key) or "").strip()
        for key in ("headline", "client_pitch", "supplier_benefit")
    )


@router.get("/clients/{client_id}/analyse")
def analyse_client(
    client_id: UUID,
    db: Session = Depends(get_db),
):
    try:
        client = db.query(Client).filter(Client.id == client_id, Client.is_active.is_(True)).first()
        if not client:
            return error("Client not found")

        since = datetime.now(timezone.utc) - timedelta(hours=24)
        cached = (
            db.query(ClientOfferRecommendation)
            .filter(ClientOfferRecommendation.client_id == client_id, ClientOfferRecommendation.created_at >= since)
            .order_by(ClientOfferRecommendation.created_at.desc())
            .all()
        )
        if cached and all(_has_marketing_copy(o) for o in cached[:2]):
            return success([_serialize_offer(o) for o in cached])

        summary = extract_client_patterns(db, client_id)
        summary["client_name"] = client.name
        summary["has_enough_history"] = bool(summary.get("avg_monthly_spend", 0) > 0 or summary.get("top_items"))

        try:
            offers = call_gemini_offers(client_summary=summary)
        except Exception as e:
            msg = str(e)
            if "HTTP 429" in msg:
                offers = fallback_offers(summary)
                if not offers:
                    return error("Gemini is rate-limiting and no fallback offers could be generated.")
            else:
                return error(msg)

        saved = []
        for o in offers:
            rec = ClientOfferRecommendation(
                client_id=client_id,
                offer_type=o["offer_type"],
                offer_details={
                    **o["offer_details"],
                    "headline": o.get("headline"),
                    "client_pitch": o.get("client_pitch"),
                    "supplier_benefit": o.get("supplier_benefit"),
                },
                reasoning=o["reasoning"],
                status="pending",
            )
            db.add(rec)
            saved.append(rec)

        if not saved:
            return success([])

        db.commit()
        for r in saved:
            db.refresh(r)

        return success([_serialize_offer(r) for r in saved])
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.get("/clients/{client_id}")
def list_client_offers(client_id: UUID, db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(ClientOfferRecommendation)
            .filter(ClientOfferRecommendation.client_id == client_id)
            .order_by(ClientOfferRecommendation.created_at.desc())
            .all()
        )
        return success([_serialize_offer(o) for o in rows])
    except Exception as e:
        return error(str(e))


@router.put("/{offer_id}/status")
def update_offer_status(offer_id: UUID, payload: OfferStatusUpdateIn, db: Session = Depends(get_db)):
    try:
        if payload.status not in {"active", "rejected"}:
            return error("Invalid status")

        offer = db.query(ClientOfferRecommendation).filter(ClientOfferRecommendation.id == offer_id).first()
        if not offer:
            return error("Offer not found")

        offer.status = payload.status
        db.add(offer)
        db.commit()
        db.refresh(offer)
        return success(_serialize_offer(offer))
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.get("/active")
def list_active_offers(db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(ClientOfferRecommendation)
            .join(Client, Client.id == ClientOfferRecommendation.client_id)
            .filter(ClientOfferRecommendation.status == "active")
            .order_by(ClientOfferRecommendation.created_at.desc())
            .all()
        )
        return success(
            [
                {
                    **_serialize_offer(o),
                    "client_name": o.client.name if o.client else None,
                }
                for o in rows
            ]
        )
    except Exception as e:
        return error(str(e))


@router.post("/simulate")
def simulate(payload: OfferSimulationIn, db: Session = Depends(get_db)):
    try:
        # client_id optional: if missing, just compute and return without saving
        if payload.client_id:
            c = (
                db.query(Client)
                .filter(Client.id == payload.client_id, Client.is_active.is_(True))
                .first()
            )
            if not c:
                return error("Client not found")

        result = simulate_offer(
            offer_type=payload.offer_type,
            parameters=payload.parameters,
            expected_order_value=payload.expected_order_value,
            cost_price_percent=payload.cost_price_percent,
        )

        if not payload.client_id:
            return success({"result": result, "id": None})

        sim = OfferSimulation(
            client_id=payload.client_id,
            offer_type=payload.offer_type,
            parameters=payload.parameters,
            result=result,
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)

        return success({"result": result, "id": str(sim.id)})
    except Exception as e:
        db.rollback()
        return error(str(e))
