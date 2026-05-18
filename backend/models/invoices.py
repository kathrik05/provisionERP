import uuid

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )

    invoice_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales_orders.id"), nullable=False, unique=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )

    invoice_date: Mapped[Date] = mapped_column(
        Date(), nullable=False, server_default=func.current_date()
    )
    due_date: Mapped[Date] = mapped_column(Date(), nullable=False)

    status: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="unpaid"
    )  # unpaid | partially_paid | paid

    amount_due: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )

    storage_mode: Mapped[str] = mapped_column(String(32), nullable=False)
    pdf_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    drive_file_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    drive_link: Mapped[str | None] = mapped_column(Text, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    order = relationship("SalesOrder")
    client = relationship("Client")
    payments = relationship(
        "Payment", back_populates="invoice", cascade="all, delete-orphan"
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[Date] = mapped_column(
        Date(), nullable=False, server_default=func.current_date()
    )
    method: Mapped[str] = mapped_column(String(32), nullable=False)  # cash | bank_transfer | cheque
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    invoice = relationship("Invoice", back_populates="payments")
    client = relationship("Client")

