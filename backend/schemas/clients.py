from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ClientBase(BaseModel):
    name: str = Field(min_length=1)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    credit_limit: float = Field(default=0, ge=0)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]):
        if v is None or v == "":
            return None
        if not v.isdigit():
            raise ValueError("phone must contain digits only")
        if len(v) > 15:
            raise ValueError("phone must be at most 15 digits")
        return v


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    credit_limit: Optional[float] = Field(default=None, ge=0)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]):
        if v is None or v == "":
            return None
        if not v.isdigit():
            raise ValueError("phone must contain digits only")
        if len(v) > 15:
            raise ValueError("phone must be at most 15 digits")
        return v


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    credit_limit: float
    outstanding_balance: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

