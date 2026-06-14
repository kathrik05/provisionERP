from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    name: str = Field(..., max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    address: str | None = None
    credit_limit: float = 0.0
    credit_days: int = 0
    is_active: bool = True


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=255)
    address: str | None = None
    credit_limit: float | None = None
    credit_days: int | None = None
    is_active: bool | None = None


class SupplierResponse(SupplierBase):
    id: UUID
    outstanding_balance: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
