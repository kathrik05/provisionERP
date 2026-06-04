from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InvoiceGenerateIn(BaseModel):
    due_date: date
    notes: Optional[str] = None


class PaymentCreateIn(BaseModel):
    amount: float = Field(gt=0)
    payment_date: Optional[date] = None
    method: str  # cash | bank_transfer | cheque
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    client_id: UUID
    amount: float
    payment_date: date
    method: str
    notes: Optional[str] = None
    created_at: datetime


class InvoiceListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    order_id: UUID
    client_id: UUID
    invoice_date: date
    due_date: date
    status: str
    amount_due: float
    amount_paid: float
    storage_mode: str
    drive_link: Optional[str] = None
    created_at: datetime
    client: Optional[dict] = None
    order: Optional[dict] = None


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: str
    order_id: UUID
    client_id: UUID
    invoice_date: date
    due_date: date
    status: str
    amount_due: float
    amount_paid: float
    storage_mode: str
    pdf_data: Optional[str] = None
    drive_file_id: Optional[str] = None
    drive_link: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    client: Optional[dict] = None
    order: Optional[dict] = None
    payments: List[PaymentOut] = Field(default_factory=list)

