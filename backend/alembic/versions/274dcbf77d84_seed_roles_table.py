"""seed roles table

Revision ID: 274dcbf77d84
Revises: 63ca15a34c6f
Create Date: 2026-05-12 12:16:42.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "274dcbf77d84"
down_revision: Union[str, Sequence[str], None] = "63ca15a34c6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Insert the ten predefined roles
    op.execute("""
        INSERT INTO roles (name, tier) VALUES
        ('Frontend Engineer', 'CORE'),
        ('Backend Engineer', 'CORE'),
        ('Full-Stack Engineer', 'CORE'),
        ('Mobile Engineer (iOS / Android)', 'CORE'),
        ('DevOps / Infrastructure Engineer', 'CORE'),
        ('Data Engineer', 'CORE'),
        ('ML / AI Engineer', 'SPECIALIZED'),
        ('Data Scientist', 'SPECIALIZED'),
        ('Security Engineer', 'SPECIALIZED'),
        ('QA Engineer', 'SPECIALIZED')
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "DELETE FROM roles WHERE name IN ('Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer', 'Mobile Engineer (iOS / Android)', 'DevOps / Infrastructure Engineer', 'Data Engineer', 'ML / AI Engineer', 'Data Scientist', 'Security Engineer', 'QA Engineer')"
    )
