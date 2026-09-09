"""add_expires_at_and_duration_days

Revision ID: ac1068d417e6
Revises: 7578f4bbec7f
Create Date: 2026-09-10 00:52:24.183205

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac1068d417e6'
down_revision: Union[str, Sequence[str], None] = '7578f4bbec7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. book_permissions.expires_at
    try:
        bp_cols = [c['name'] for c in inspector.get_columns('book_permissions')]
        if 'expires_at' not in bp_cols:
            op.add_column('book_permissions', sa.Column('expires_at', sa.DateTime(), nullable=True))
    except Exception as e:
        print(f"Warning adding expires_at to book_permissions: {e}")

    # 2. access_requests_user.expires_at & duration_days
    try:
        aru_cols = [c['name'] for c in inspector.get_columns('access_requests_user')]
        if 'expires_at' not in aru_cols:
            op.add_column('access_requests_user', sa.Column('expires_at', sa.DateTime(), nullable=True))
        if 'duration_days' not in aru_cols:
            op.add_column('access_requests_user', sa.Column('duration_days', sa.Integer(), nullable=True))
    except Exception as e:
        print(f"Warning adding columns to access_requests_user: {e}")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    try:
        bp_cols = [c['name'] for c in inspector.get_columns('book_permissions')]
        if 'expires_at' in bp_cols:
            op.drop_column('book_permissions', 'expires_at')
    except Exception:
        pass

    try:
        aru_cols = [c['name'] for c in inspector.get_columns('access_requests_user')]
        if 'duration_days' in aru_cols:
            op.drop_column('access_requests_user', 'duration_days')
        if 'expires_at' in aru_cols:
            op.drop_column('access_requests_user', 'expires_at')
    except Exception:
        pass