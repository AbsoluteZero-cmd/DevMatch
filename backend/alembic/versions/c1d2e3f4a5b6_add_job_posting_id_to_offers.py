"""add job_posting_id to offers

Revision ID: c1d2e3f4a5b6
Revises: f86f66b117f8
Create Date: 2026-05-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "f86f66b117f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "offers",
        sa.Column("job_posting_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_offers_job_posting_id_job_postings",
        "offers",
        "job_postings",
        ["job_posting_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_offers_job_posting_id_job_postings", "offers", type_="foreignkey"
    )
    op.drop_column("offers", "job_posting_id")
