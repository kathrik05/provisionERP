from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_base64: Mapped[str | None] = mapped_column(Text, nullable=True)

    storage_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="local"
    )  # local | google_drive

    drive_client_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drive_client_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drive_redirect_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)

    drive_access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    drive_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    drive_token_expiry: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

