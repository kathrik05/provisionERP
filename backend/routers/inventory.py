from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from database import get_db
from models.items import Item
from response import error, success
from schemas.items import AdjustStockIn, ItemCreate, ItemOut, ItemUpdate


router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("")
def list_items(
    search: str | None = Query(default=None),
    low_stock: bool | None = Query(default=None),
    db: Session = Depends(get_db),
):
    try:
        query = db.query(Item).filter(Item.is_active.is_(True))

        if search:
            like = f"%{search}%"
            query = query.filter(or_(Item.name.ilike(like), Item.category.ilike(like)))

        if low_stock:
            query = query.filter(
                and_(
                    Item.track_stock.is_(True),
                    Item.stock_quantity <= Item.reorder_level,
                )
            )

        items = query.order_by(Item.created_at.desc()).all()
        payload = [ItemOut.model_validate(i).model_dump() for i in items]
        return success(payload)
    except Exception as e:
        return error(str(e))


@router.get("/{item_id}")
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    try:
        item = db.query(Item).filter(Item.id == item_id, Item.is_active.is_(True)).first()
        if not item:
            return error("Item not found")
        return success(ItemOut.model_validate(item).model_dump())
    except Exception as e:
        return error(str(e))


@router.post("")
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    try:
        item = Item(
            name=payload.name,
            description=payload.description,
            category=payload.category,
            unit=payload.unit,
            price=payload.price,
            track_stock=payload.track_stock,
            stock_quantity=payload.stock_quantity if payload.track_stock else 0,
            reorder_level=payload.reorder_level if payload.track_stock else 0,
            tax_id=payload.tax_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return success(ItemOut.model_validate(item).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.put("/{item_id}")
def update_item(item_id: UUID, payload: ItemUpdate, db: Session = Depends(get_db)):
    try:
        item = db.query(Item).filter(Item.id == item_id, Item.is_active.is_(True)).first()
        if not item:
            return error("Item not found")

        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(item, k, v)

        if item.track_stock is False:
            item.stock_quantity = 0
            item.reorder_level = 0

        db.add(item)
        db.commit()
        db.refresh(item)
        return success(ItemOut.model_validate(item).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{item_id}/deactivate")
def deactivate_item(item_id: UUID, db: Session = Depends(get_db)):
    try:
        item = db.query(Item).filter(Item.id == item_id, Item.is_active.is_(True)).first()
        if not item:
            return error("Item not found")
        item.is_active = False
        db.add(item)
        db.commit()
        return success(True)
    except Exception as e:
        db.rollback()
        return error(str(e))


@router.patch("/{item_id}/adjust-stock")
def adjust_stock(item_id: UUID, payload: AdjustStockIn, db: Session = Depends(get_db)):
    try:
        item = db.query(Item).filter(Item.id == item_id, Item.is_active.is_(True)).first()
        if not item:
            return error("Item not found")
        if not item.track_stock:
            return error("Stock tracking is disabled for this item")

        item.stock_quantity = (item.stock_quantity or 0) + payload.adjustment
        db.add(item)
        db.commit()
        db.refresh(item)
        return success(ItemOut.model_validate(item).model_dump())
    except Exception as e:
        db.rollback()
        return error(str(e))
