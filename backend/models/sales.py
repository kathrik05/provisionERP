import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    order_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id"),
        nullable=False,
    )

    order_date: Mapped[Date] = mapped_column(
        Date(),
        nullable=False,
        server_default=func.current_date(),
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="draft",
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    extra_charge: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    extra_charge_label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
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

    client = relationship("Client")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales_orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    tax_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_rules.id"), nullable=True
    )
    tax_rate: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )

    order = relationship("SalesOrder", back_populates="items")
    item = relationship("Item")
