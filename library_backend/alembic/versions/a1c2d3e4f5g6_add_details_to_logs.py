"""add details to logs

Revision ID: a1c2d3e4f5g6
Revises: 02df56eb99b9
Create Date: 2026-07-28 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c2d3e4f5g6'
down_revision: Union[str, Sequence[str], None] = '02df56eb99b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('logs', sa.Column('details', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('logs', 'details')