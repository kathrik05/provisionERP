"""tax rules + tax columns on items/orders

Revision ID: 202605150004
Revises: 202605150003
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202605150004"
down_revision = "202605150003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.create_table(
        "tax_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("rate", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.add_column("items", sa.Column("tax_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_items_tax_id", "items", "tax_rules", ["tax_id"], ["id"]
    )

    op.add_column(
        "order_items", sa.Column("tax_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        "fk_order_items_tax_id", "order_items", "tax_rules", ["tax_id"], ["id"]
    )
    op.add_column(
        "order_items",
        sa.Column("tax_rate", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
    )
    op.add_column(
        "order_items",
        sa.Column(
            "tax_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.add_column(
        "sales_orders",
        sa.Column("extra_charge", sa.Numeric(12, 2), nullable=False, server_default=sa.text("0")),
    )
    op.add_column("sales_orders", sa.Column("extra_charge_label", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("sales_orders", "extra_charge_label")
    op.drop_column("sales_orders", "extra_charge")

    op.drop_column("order_items", "tax_amount")
    op.drop_column("order_items", "tax_rate")
    op.drop_constraint("fk_order_items_tax_id", "order_items", type_="foreignkey")
    op.drop_column("order_items", "tax_id")

    op.drop_constraint("fk_items_tax_id", "items", type_="foreignkey")
    op.drop_column("items", "tax_id")

    op.drop_table("tax_rules")

