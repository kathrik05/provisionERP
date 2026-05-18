import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)

    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    track_stock: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    stock_quantity: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    reorder_level: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )

    tax_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_rules.id"), nullable=True
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
