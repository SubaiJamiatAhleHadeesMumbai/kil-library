"""add homepage poster height fields

Revision ID: e3b9b8d4f71a
Revises: b7f4c1d2e3f4
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3b9b8d4f71a'
down_revision: Union[str, Sequence[str], None] = 'b7f4c1d2e3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('homepage_posters', sa.Column('desktop_fit', sa.String(length=20), nullable=False, server_default='cover'))
    op.add_column('homepage_posters', sa.Column('mobile_fit', sa.String(length=20), nullable=False, server_default='cover'))
    op.add_column('homepage_posters', sa.Column('desktop_height', sa.Integer(), nullable=False, server_default='520'))
    op.add_column('homepage_posters', sa.Column('mobile_height', sa.Integer(), nullable=False, server_default='380'))
    op.add_column('homepage_posters', sa.Column('caption_alignment', sa.String(length=20), nullable=False, server_default='bottom'))


def downgrade() -> None:
    op.drop_column('homepage_posters', 'caption_alignment')
    op.drop_column('homepage_posters', 'mobile_height')
    op.drop_column('homepage_posters', 'desktop_height')
    op.drop_column('homepage_posters', 'mobile_fit')
    op.drop_column('homepage_posters', 'desktop_fit')