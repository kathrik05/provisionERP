from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = Field(min_length=1)
    price: float = Field(gt=0)
    track_stock: bool = False
    stock_quantity: float = Field(default=0, ge=0)
    reorder_level: float = Field(default=0, ge=0)
    tax_id: Optional[UUID] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = Field(default=None, min_length=1)
    price: Optional[float] = Field(default=None, gt=0)
    track_stock: Optional[bool] = None
    stock_quantity: Optional[float] = Field(default=None, ge=0)
    reorder_level: Optional[float] = Field(default=None, ge=0)
    tax_id: Optional[UUID] = None


class AdjustStockIn(BaseModel):
    adjustment: float
    reason: str = Field(min_length=1)


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str
    price: float
    track_stock: bool
    stock_quantity: float
    reorder_level: float
    tax_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
