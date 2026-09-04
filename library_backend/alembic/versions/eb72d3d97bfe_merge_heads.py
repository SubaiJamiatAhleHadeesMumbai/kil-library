"""merge_heads

Revision ID: eb72d3d97bfe
Revises: 1b2c3d4e5f6a, c1d2e3f4a5b6
Create Date: 2026-09-02 22:31:43.676809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eb72d3d97bfe'
down_revision: Union[str, Sequence[str], None] = ('1b2c3d4e5f6a', 'c1d2e3f4a5b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass