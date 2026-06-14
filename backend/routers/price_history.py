from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models.price_history import ItemPriceHistory
from models.items import Item
from models.suppliers import Supplier
from schemas.price_history import ItemPriceHistoryCreate, ItemPriceHistoryResponse

router = APIRouter(prefix="/price-history", tags=["Price History"])


@router.get("/{item_id}", response_model=dict)
def get_item_price_history(item_id: UUID, db: Session = Depends(get_db)):
    # Returns history across all suppliers for an item, ordered by date desc
    history = db.execute(
        select(ItemPriceHistory)
        .where(ItemPriceHistory.item_id == item_id)
        .order_by(ItemPriceHistory.price_date.desc())
    ).scalars().all()
    
    data = [ItemPriceHistoryResponse.model_validate(h).model_dump() for h in history]
    return {"data": data, "message": "success", "error": None}


@router.get("/{item_id}/{supplier_id}", response_model=dict)
def get_item_supplier_price_history(item_id: UUID, supplier_id: UUID, db: Session = Depends(get_db)):
    history = db.execute(
        select(ItemPriceHistory)
        .where(ItemPriceHistory.item_id == item_id)
        .where(ItemPriceHistory.supplier_id == supplier_id)
        .order_by(ItemPriceHistory.price_date.desc())
    ).scalars().all()
    data = [ItemPriceHistoryResponse.model_validate(h).model_dump() for h in history]
    return {"data": data, "message": "success", "error": None}


@router.post("", response_model=dict)
def add_price_history(entry_in: ItemPriceHistoryCreate, db: Session = Depends(get_db)):
    # Verify item and supplier exist
    item = db.execute(select(Item).where(Item.id == entry_in.item_id)).scalar_one_or_none()
    supplier = db.execute(select(Supplier).where(Supplier.id == entry_in.supplier_id)).scalar_one_or_none()
    
    if not item or not supplier:
        raise HTTPException(status_code=400, detail="Invalid item_id or supplier_id")
        
    # Find previous price to calculate change_percent
    prev_entry = db.execute(
        select(ItemPriceHistory)
        .where(ItemPriceHistory.item_id == entry_in.item_id)
        .where(ItemPriceHistory.supplier_id == entry_in.supplier_id)
        .order_by(ItemPriceHistory.price_date.desc())
        .limit(1)
    ).scalar_one_or_none()
    
    change_percent = None
    if prev_entry and prev_entry.price > 0:
        change_percent = ((entry_in.price - prev_entry.price) / prev_entry.price) * 100
        
    new_entry = ItemPriceHistory(
        **entry_in.model_dump(),
        change_percent=change_percent
    )
    
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return {"data": ItemPriceHistoryResponse.model_validate(new_entry).model_dump(), "message": "success", "error": None}
