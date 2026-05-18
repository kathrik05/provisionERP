from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


ALLOWED_STATUSES = {"draft", "confirmed", "invoiced", "paid"}


class OrderItemIn(BaseModel):
    item_id: UUID
    quantity: float = Field(gt=0)
    unit_price: float = Field(gt=0)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_id: UUID
    quantity: float
    unit_price: float
    line_total: float
    tax_id: Optional[UUID] = None
    tax_rate: float = 0
    tax_amount: float = 0
    item: Optional[dict] = None


class SalesOrderCreate(BaseModel):
    client_id: UUID
    order_date: Optional[date] = None
    notes: Optional[str] = None
    items: List[OrderItemIn] = Field(default_factory=list)


class SalesOrderUpdate(BaseModel):
    order_date: Optional[date] = None
    notes: Optional[str] = None
    items: Optional[List[OrderItemIn]] = None


class SalesOrderListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    client_id: UUID
    order_date: date
    status: str
    subtotal: float
    tax_amount: float
    total: float
    created_at: datetime
    updated_at: datetime
    client: Optional[dict] = None
    items_count: int = 0


class SalesOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_number: str
    client_id: UUID
    order_date: date
    status: str
    notes: Optional[str] = None
    subtotal: float
    tax_amount: float
    extra_charge: float = 0
    extra_charge_label: Optional[str] = None
    total: float
    created_at: datetime
    updated_at: datetime
    client: Optional[dict] = None
    items: List[OrderItemOut] = Field(default_factory=list)


class AddSingleItemIn(BaseModel):
    item_id: UUID
    quantity: float = Field(gt=0)
    unit_price: Optional[float] = None


class ExtraChargeIn(BaseModel):
    extra_charge: float = 0
    extra_charge_label: Optional[str] = None


class OverrideLineTaxIn(BaseModel):
    tax_id: Optional[UUID] = None
