"""add current fields to fatawa questions

Revision ID: 1b2c3d4e5f6a
Revises: 8c9d7e6f5a4b
Create Date: 2026-08-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1b2c3d4e5f6a'
down_revision: Union[str, Sequence[str], None] = '8c9d7e6f5a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('fatawa_questions', sa.Column('user_id', sa.Integer(), nullable=True))
    op.add_column('fatawa_questions', sa.Column('display_name', sa.String(length=255), nullable=True))
    op.add_column('fatawa_questions', sa.Column('guest_email', sa.String(length=255), nullable=True))
    op.add_column('fatawa_questions', sa.Column('is_anonymous', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('fatawa_questions', sa.Column('visibility', sa.String(length=20), server_default=sa.text("'public'"), nullable=False))
    op.add_column('fatawa_questions', sa.Column('answered_by_id', sa.Integer(), nullable=True))
    op.add_column('fatawa_questions', sa.Column('deleted_at', sa.DateTime(), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE fatawa_questions
            SET display_name = COALESCE(display_name, asked_by_name),
                guest_email = COALESCE(guest_email, asked_by_email)
            """
        )
    )

    op.create_foreign_key(
        'fk_fatawa_questions_user_id_users',
        'fatawa_questions',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_fatawa_questions_answered_by_id_users',
        'fatawa_questions',
        'users',
        ['answered_by_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('idx_fatawa_question_status_visibility', 'fatawa_questions', ['status', 'visibility', 'deleted_at'], unique=False)
    op.create_index('idx_fatawa_question_category_created', 'fatawa_questions', ['category_id', 'created_at'], unique=False)
    op.create_index('idx_fatawa_question_user_status', 'fatawa_questions', ['user_id', 'status', 'deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_fatawa_question_user_status', table_name='fatawa_questions')
    op.drop_index('idx_fatawa_question_category_created', table_name='fatawa_questions')
    op.drop_index('idx_fatawa_question_status_visibility', table_name='fatawa_questions')
    op.drop_constraint('fk_fatawa_questions_answered_by_id_users', 'fatawa_questions', type_='foreignkey')
    op.drop_constraint('fk_fatawa_questions_user_id_users', 'fatawa_questions', type_='foreignkey')
    op.drop_column('fatawa_questions', 'deleted_at')
    op.drop_column('fatawa_questions', 'answered_by_id')
    op.drop_column('fatawa_questions', 'visibility')
    op.drop_column('fatawa_questions', 'is_anonymous')
    op.drop_column('fatawa_questions', 'guest_email')
    op.drop_column('fatawa_questions', 'display_name')
    op.drop_column('fatawa_questions', 'user_id')