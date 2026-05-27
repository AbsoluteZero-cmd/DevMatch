"""add role to users

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-27 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = sa.Enum(
    "DEVELOPER",
    "TEAM_LEADER",
    "ADMIN",
    name="user_role",
)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            user_role_enum,
            nullable=False,
            server_default="DEVELOPER",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
    bind = op.get_bind()
    user_role_enum.drop(bind, checkfirst=True)
