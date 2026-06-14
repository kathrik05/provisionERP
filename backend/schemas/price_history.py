from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from .suppliers import SupplierResponse


class ItemPriceHistoryBase(BaseModel):
    item_id: UUID
    supplier_id: UUID
    price: float = Field(..., ge=0)
    price_date: date = Field(default_factory=date.today)
    notes: str | None = None


class ItemPriceHistoryCreate(ItemPriceHistoryBase):
    pass


class ItemPriceHistoryResponse(ItemPriceHistoryBase):
    id: UUID
    change_percent: float | None
    created_at: datetime
    
    supplier: SupplierResponse | None = None

    class Config:
        from_attributes = True
