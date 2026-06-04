"""create client_offer_recommendations and offer_simulations

Revision ID: 202605250001
Revises: 202605150006
Create Date: 2026-05-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202605250001"
down_revision = "202605150006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    op.create_table(
        "client_offer_recommendations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column("offer_type", sa.String(length=64), nullable=False),
        sa.Column("offer_details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_client_offer_recommendations_client_id",
        "client_offer_recommendations",
        ["client_id"],
    )
    op.create_index(
        "ix_client_offer_recommendations_status",
        "client_offer_recommendations",
        ["status"],
    )

    op.create_table(
        "offer_simulations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "client_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clients.id"),
            nullable=False,
        ),
        sa.Column("offer_type", sa.String(length=64), nullable=False),
        sa.Column("parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_offer_simulations_client_id", "offer_simulations", ["client_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_offer_simulations_client_id", table_name="offer_simulations")
    op.drop_table("offer_simulations")

    op.drop_index(
        "ix_client_offer_recommendations_status",
        table_name="client_offer_recommendations",
    )
    op.drop_index(
        "ix_client_offer_recommendations_client_id",
        table_name="client_offer_recommendations",
    )
    op.drop_table("client_offer_recommendations")

