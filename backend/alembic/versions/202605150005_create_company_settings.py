"""create company_settings

Revision ID: 202605150005
Revises: 202605150004
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "202605150005"
down_revision = "202605150004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("logo_base64", sa.Text(), nullable=True),
        sa.Column(
            "storage_mode",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'local'"),
        ),
        sa.Column("drive_client_id", sa.String(length=255), nullable=True),
        sa.Column("drive_client_secret", sa.String(length=255), nullable=True),
        sa.Column("drive_redirect_uri", sa.String(length=255), nullable=True),
        sa.Column("drive_access_token", sa.Text(), nullable=True),
        sa.Column("drive_refresh_token", sa.Text(), nullable=True),
        sa.Column("drive_token_expiry", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.execute(
        "INSERT INTO company_settings (id, company_name, storage_mode) VALUES (1, '', 'local')"
    )


def downgrade() -> None:
    op.drop_table("company_settings")

