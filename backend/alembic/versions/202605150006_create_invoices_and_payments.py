"""create invoices and payments

Revision ID: 202605150006
Revises: 202605150005
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202605150006"
down_revision = "202605150005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoice_number_seq') THEN
            CREATE SEQUENCE invoice_number_seq START 1;
          END IF;
        END$$;
        """
    )

    op.create_table(
        "invoices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("invoice_number", sa.String(length=32), nullable=False, unique=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sales_orders.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column(
            "invoice_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'unpaid'"),
        ),
        sa.Column("amount_due", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "amount_paid",
            sa.Numeric(12, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("storage_mode", sa.String(length=32), nullable=False),
        sa.Column("pdf_data", sa.Text(), nullable=True),
        sa.Column("drive_file_id", sa.String(length=255), nullable=True),
        sa.Column("drive_link", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])
    op.create_index("ix_invoices_invoice_date", "invoices", ["invoice_date"])

    op.create_table(
        "payments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "invoice_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("invoices.id"),
            nullable=False,
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "payment_date",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])
    op.create_index("ix_payments_client_id", "payments", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_client_id", table_name="payments")
    op.drop_index("ix_payments_invoice_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_invoices_invoice_date", table_name="invoices")
    op.drop_index("ix_invoices_status", table_name="invoices")
    op.drop_index("ix_invoices_client_id", table_name="invoices")
    op.drop_table("invoices")

    op.execute("DROP SEQUENCE IF EXISTS invoice_number_seq;")

