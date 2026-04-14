"""add message context data

Revision ID: 20260414_0002
Revises: 20260413_0001
Create Date: 2026-04-14 12:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260414_0002"
down_revision = "20260413_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("consultation_messages", sa.Column("context_data", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("consultation_messages", "context_data")
