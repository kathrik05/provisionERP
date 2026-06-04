from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models.clients import Client
from response import error, success
from schemas.clients import ClientCreate, ClientOut, ClientUpdate


router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
def list_clients(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Client).filter(Client.is_active.is_(True))
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Client.name.ilike(like),
                    Client.phone.ilike(like),
                    Client.email.ilike(like),
                )
            )

        clients = query.order_by(Client.created_at.desc()).all()
        payload = [ClientOut.model_validate(c).model_dump() for c in clients]
        return success(payload)
    except Exception as e:
        return error(str(e))


@router.get("/{client_id}")
def get_client(client_id: UUID, db: Session = Depends(get_db)):
    try:
        client = (
            db.query(Client)
            .filter(Client.id == client_id, Client.is_active.is_(True))
            .first()
        )
        if not client:
            return error("Client not found")
        return success(ClientOut.model_validate(client).model_dump())
    except Exception as e:
        return error(str(e))


@router.post("")
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    try:
        client = Client(
            name=payload.name,
            contact_person=payload.contact_person,
            phone=payload.phone,
            email=str(payload.email) if payload.email else None,
            address=payload.address,
            credit_limit=payload.credit_limit,
        )
        db.add(client)
        db.commit()
        db.refresh(client)
        return success(ClientOut.model_validate(client).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.put("/{client_id}")
def update_client(client_id: UUID, payload: ClientUpdate, db: Session = Depends(get_db)):
    try:
        client = db.query(Client).filter(Client.id == client_id, Client.is_active.is_(True)).first()
        if not client:
            return error("Client not found")

        data = payload.model_dump(exclude_unset=True)
        if "email" in data:
            data["email"] = str(data["email"]) if data["email"] else None

        for k, v in data.items():
            setattr(client, k, v)

        db.add(client)
        db.commit()
        db.refresh(client)
        return success(ClientOut.model_validate(client).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{client_id}/deactivate")
def deactivate_client(client_id: UUID, db: Session = Depends(get_db)):
    try:
        client = db.query(Client).filter(Client.id == client_id, Client.is_active.is_(True)).first()
        if not client:
            return error("Client not found")
        client.is_active = False
        db.add(client)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))

