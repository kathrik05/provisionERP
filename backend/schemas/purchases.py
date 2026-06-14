from datetime import date, datetime
from typing import List, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from .suppliers import SupplierResponse


class PurchaseOrderItemBase(BaseModel):
    item_id: UUID
    quantity: float = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: UUID
    purchase_order_id: UUID
    line_total: float

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    supplier_id: UUID
    purchase_date: date = Field(default_factory=date.today)
    notes: str | None = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate] = Field(..., min_length=1)


class PurchaseOrderUpdate(BaseModel):
    purchase_date: date | None = None
    notes: str | None = None


class PurchaseOrderResponse(PurchaseOrderBase):
    id: UUID
    purchase_number: str
    status: str
    subtotal: float
    total: float
    amount_paid: float
    due_date: date | None
    created_at: datetime
    updated_at: datetime
    
    supplier: SupplierResponse | None = None
    items: List[PurchaseOrderItemResponse] = []

    class Config:
        from_attributes = True


class SupplierPaymentBase(BaseModel):
    amount: float = Field(..., gt=0)
    payment_date: date = Field(default_factory=date.today)
    method: Literal["cash", "bank_transfer", "cheque"]
    notes: str | None = None


class SupplierPaymentCreate(SupplierPaymentBase):
    pass


class SupplierPaymentResponse(SupplierPaymentBase):
    id: UUID
    purchase_order_id: UUID
    supplier_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
