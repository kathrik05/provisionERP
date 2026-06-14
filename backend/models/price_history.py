import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class ItemPriceHistory(Base):
    __tablename__ = "item_price_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id"),
        nullable=False,
    )
    
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    
    price_date: Mapped[Date] = mapped_column(
        Date(),
        nullable=False,
        server_default=func.current_date(),
    )
    
    change_percent: Mapped[float | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    item = relationship("Item")
    supplier = relationship("Supplier")
