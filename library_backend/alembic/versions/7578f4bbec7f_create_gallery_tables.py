"""create_gallery_tables

Revision ID: 7578f4bbec7f
Revises: 08ae07116b7a
Create Date: 2026-09-03 21:02:00.772105

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7578f4bbec7f'
down_revision: Union[str, Sequence[str], None] = '08ae07116b7a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'gallery_albums',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('title_en', sa.String(length=255), nullable=True),
        sa.Column('title_ur', sa.String(length=255), nullable=True),
        sa.Column('title_ar', sa.String(length=255), nullable=True),
        sa.Column('description_en', sa.Text(), nullable=True),
        sa.Column('description_ur', sa.Text(), nullable=True),
        sa.Column('description_ar', sa.Text(), nullable=True),
        sa.Column('year', sa.String(length=20), nullable=True),
        sa.Column('cover_image', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gallery_albums_id'), 'gallery_albums', ['id'], unique=False)

    op.create_table(
        'gallery_items',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('album_id', sa.String(length=100), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('video_url', sa.Text(), nullable=True),
        sa.Column('title_en', sa.String(length=255), nullable=True),
        sa.Column('title_ur', sa.String(length=255), nullable=True),
        sa.Column('title_ar', sa.String(length=255), nullable=True),
        sa.Column('caption_en', sa.Text(), nullable=True),
        sa.Column('caption_ur', sa.Text(), nullable=True),
        sa.Column('caption_ar', sa.Text(), nullable=True),
        sa.Column('year', sa.String(length=20), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['album_id'], ['gallery_albums.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gallery_items_album_id'), 'gallery_items', ['album_id'], unique=False)
    op.create_index(op.f('ix_gallery_items_id'), 'gallery_items', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_gallery_items_id'), table_name='gallery_items')
    op.drop_index(op.f('ix_gallery_items_album_id'), table_name='gallery_items')
    op.drop_table('gallery_items')
    op.drop_index(op.f('ix_gallery_albums_id'), table_name='gallery_albums')
    op.drop_table('gallery_albums')