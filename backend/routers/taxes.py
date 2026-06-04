from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.taxes import TaxRule
from response import error, success
from schemas.taxes import TaxRuleCreate, TaxRuleOut, TaxRuleUpdate


router = APIRouter(prefix="/taxes", tags=["taxes"])


@router.get("")
def list_tax_rules(
    active_only: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        q = db.query(TaxRule)
        if active_only:
            q = q.filter(TaxRule.is_active.is_(True))
        rules = q.order_by(TaxRule.created_at.desc()).all()
        return success([TaxRuleOut.model_validate(r).model_dump() for r in rules])
    except Exception as e:
        return error(str(e))


@router.get("/{tax_id}")
def get_tax_rule(tax_id: UUID, db: Session = Depends(get_db)):
    try:
        r = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
        if not r:
            return error("Tax rule not found")
        return success(TaxRuleOut.model_validate(r).model_dump())
    except Exception as e:
        return error(str(e))


@router.post("")
def create_tax_rule(payload: TaxRuleCreate, db: Session = Depends(get_db)):
    try:
        r = TaxRule(name=payload.name, rate=payload.rate, is_default=payload.is_default)
        db.add(r)
        db.flush()

        if payload.is_default:
            db.query(TaxRule).filter(TaxRule.id != r.id).update({"is_default": False})
            r.is_default = True

        db.commit()
        db.refresh(r)
        return success(TaxRuleOut.model_validate(r).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.put("/{tax_id}")
def update_tax_rule(tax_id: UUID, payload: TaxRuleUpdate, db: Session = Depends(get_db)):
    try:
        r = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
        if not r:
            return error("Tax rule not found")

        data = payload.model_dump(exclude_unset=True)
        if "is_default" in data and data["is_default"]:
            db.query(TaxRule).update({"is_default": False})
            r.is_default = True
            data.pop("is_default", None)
        elif "is_default" in data and data["is_default"] is False:
            r.is_default = False
            data.pop("is_default", None)

        for k, v in data.items():
            setattr(r, k, v)

        db.add(r)
        db.commit()
        db.refresh(r)
        return success(TaxRuleOut.model_validate(r).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{tax_id}/set-default")
def set_default_tax_rule(tax_id: UUID, db: Session = Depends(get_db)):
    try:
        r = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
        if not r:
            return error("Tax rule not found")

        db.query(TaxRule).update({"is_default": False})
        r.is_default = True
        r.is_active = True
        db.add(r)
        db.commit()
        db.refresh(r)
        return success(TaxRuleOut.model_validate(r).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{tax_id}/deactivate")
def deactivate_tax_rule(tax_id: UUID, db: Session = Depends(get_db)):
    try:
        r = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
        if not r:
            return error("Tax rule not found")
        r.is_active = False
        r.is_default = False
        db.add(r)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))
