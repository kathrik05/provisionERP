import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    purchase_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    purchase_date: Mapped[Date] = mapped_column(
        Date(),
        nullable=False,
        server_default=func.current_date(),
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="'pending'",
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    
    total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    
    amount_paid: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    
    due_date: Mapped[Date | None] = mapped_column(
        Date(), nullable=True
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

    supplier = relationship("Supplier")
    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("items.id"),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("Item")


class SupplierPayment(Base):
    __tablename__ = "supplier_payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
    )

    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id"),
        nullable=False,
    )
    
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
    )

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    
    payment_date: Mapped[Date] = mapped_column(
        Date(),
        nullable=False,
        server_default=func.current_date(),
    )
    
    method: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    purchase_order = relationship("PurchaseOrder")
    supplier = relationship("Supplier")
