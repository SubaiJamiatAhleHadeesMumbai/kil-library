"""add_ix_books_status_access

Revision ID: 08ae07116b7a
Revises: eb72d3d97bfe
Create Date: 2026-09-02 22:37:53.663309

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08ae07116b7a'
down_revision: Union[str, Sequence[str], None] = 'eb72d3d97bfe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_books_status_access',
        'books',
        ['deleted_at', 'is_approved', 'is_restricted'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_books_status_access', table_name='books', if_exists=True)