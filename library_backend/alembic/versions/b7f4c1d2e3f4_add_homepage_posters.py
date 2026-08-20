"""add homepage posters

Revision ID: b7f4c1d2e3f4
Revises: a1c2d3e4f5g6
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'b7f4c1d2e3f4'
down_revision: Union[str, Sequence[str], None] = 'a1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table('homepage_posters'):
        op.create_table(
            'homepage_posters',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('translations', sa.JSON(), nullable=False),
            sa.Column('media_type', sa.String(length=20), nullable=False),
            sa.Column('desktop_image_url', sa.String(length=500), nullable=True),
            sa.Column('mobile_image_url', sa.String(length=500), nullable=True),
            sa.Column('desktop_image_size', sa.String(length=100), nullable=True),
            sa.Column('mobile_image_size', sa.String(length=100), nullable=True),
            sa.Column('desktop_frame_width', sa.Integer(), nullable=False, server_default='1200'),
            sa.Column('mobile_frame_width', sa.Integer(), nullable=False, server_default='1080'),
            sa.Column('desktop_fit', sa.String(length=20), nullable=False, server_default='cover'),
            sa.Column('mobile_fit', sa.String(length=20), nullable=False, server_default='cover'),
            sa.Column('desktop_height', sa.Integer(), nullable=False, server_default='520'),
            sa.Column('mobile_height', sa.Integer(), nullable=False, server_default='380'),
            sa.Column('caption_alignment', sa.String(length=20), nullable=False, server_default='bottom'),
            sa.Column('program_name', sa.String(length=255), nullable=True),
            sa.Column('event_date', sa.String(length=100), nullable=True),
            sa.Column('location_name', sa.String(length=255), nullable=True),
            sa.Column('location_url', sa.String(length=500), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('sort_order', sa.Integer(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.Column('author_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['author_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
            mysql_engine='InnoDB'
        )
        op.create_index(op.f('ix_homepage_posters_id'), 'homepage_posters', ['id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table('homepage_posters'):
        indexes = {index['name'] for index in inspector.get_indexes('homepage_posters')}
        if op.f('ix_homepage_posters_id') in indexes:
            op.drop_index(op.f('ix_homepage_posters_id'), table_name='homepage_posters')
        op.drop_table('homepage_posters')