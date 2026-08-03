"""add homepage poster frame widths

Revision ID: f1d2c3b4a5e6
Revises: e3b9b8d4f71a
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1d2c3b4a5e6'
down_revision: Union[str, Sequence[str], None] = 'e3b9b8d4f71a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('homepage_posters', sa.Column('desktop_frame_width', sa.Integer(), nullable=False, server_default='1200'))
    op.add_column('homepage_posters', sa.Column('mobile_frame_width', sa.Integer(), nullable=False, server_default='1080'))


def downgrade() -> None:
    op.drop_column('homepage_posters', 'mobile_frame_width')
    op.drop_column('homepage_posters', 'desktop_frame_width')