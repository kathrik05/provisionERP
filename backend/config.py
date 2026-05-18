from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://erp_user:erp_pass@db:5432/provisions_erp"
    SECRET_KEY: str = "change-me"

    # Optional legacy env vars (Drive is configured via company_settings table)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
