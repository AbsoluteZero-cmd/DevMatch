"""extend offer_status enum with ACCEPTED and CANCELLED

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-05-27 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
    # older PG versions, so use Alembic's autocommit block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'ACCEPTED'")
        op.execute("ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum directly.
    # If a true rollback is required, recreate the type without these values
    # and migrate the column. Left as a no-op for now.
    pass
