from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaxRuleCreate(BaseModel):
    name: str = Field(min_length=1)
    rate: float = Field(ge=0)
    is_default: bool = False


class TaxRuleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    rate: Optional[float] = Field(default=None, ge=0)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class TaxRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    rate: float
    is_default: bool
    is_active: bool
    created_at: datetime

