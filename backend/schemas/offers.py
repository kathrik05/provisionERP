from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


ALLOWED_OFFER_TYPES = {
    "buy_get_free",
    "slab_discount",
    "early_payment",
    "loyalty_credit",
}

ALLOWED_STATUSES = {"pending", "active", "rejected"}


class OfferRecommendationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    offer_type: str
    offer_details: Dict[str, Any]
    reasoning: str
    status: str
    created_at: datetime


class OfferStatusUpdateIn(BaseModel):
    status: str = Field()


class OfferSimulationIn(BaseModel):
    client_id: Optional[UUID] = None
    offer_type: str
    parameters: Dict[str, Any]
    expected_order_value: float = Field(gt=0)
    cost_price_percent: float = Field(gt=0, le=100)


class OfferSimulationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    offer_type: str
    parameters: Dict[str, Any]
    result: Dict[str, Any]
    created_at: datetime

