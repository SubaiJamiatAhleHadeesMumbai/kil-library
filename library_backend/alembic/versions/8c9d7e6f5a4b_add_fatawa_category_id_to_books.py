"""add fatawa category id to books

Revision ID: 8c9d7e6f5a4b
Revises: a1c2d3e4f5g6
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c9d7e6f5a4b'
down_revision: Union[str, Sequence[str], None] = 'fatawa_questions_and_book_flag_20260721'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('books', sa.Column('fatawa_category_id', sa.Integer(), nullable=True))
    op.create_index('ix_books_fatawa_category_id', 'books', ['fatawa_category_id'], unique=False)
    op.create_foreign_key(
        'fk_books_fatawa_category_id_fatawa_categories',
        'books',
        'fatawa_categories',
        ['fatawa_category_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_books_fatawa_category_id_fatawa_categories', 'books', type_='foreignkey')
    op.drop_index('ix_books_fatawa_category_id', table_name='books')
    op.drop_column('books', 'fatawa_category_id')