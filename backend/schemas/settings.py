from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CompanySettingsUpsert(BaseModel):
    company_name: str = Field(min_length=1)
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    logo_base64: Optional[str] = None

    storage_mode: Optional[str] = None  # local | google_drive

    drive_client_id: Optional[str] = None
    drive_client_secret: Optional[str] = None
    drive_redirect_uri: Optional[str] = None

    @field_validator("storage_mode")
    @classmethod
    def validate_storage_mode(cls, v: Optional[str]):
        if v is None:
            return None
        if v not in {"local", "google_drive"}:
            raise ValueError("storage_mode must be local or google_drive")
        return v


class CompanySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_base64: Optional[str] = None

    storage_mode: str
    drive_client_id: Optional[str] = None
    drive_redirect_uri: Optional[str] = None
    drive_token_expiry: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DriveAuthUrlOut(BaseModel):
    url: str

