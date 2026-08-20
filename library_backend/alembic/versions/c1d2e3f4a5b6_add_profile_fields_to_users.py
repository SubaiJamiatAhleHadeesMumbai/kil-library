"""add_profile_fields_to_users

Revision ID: c1d2e3f4a5b6
Revises: f1d2c3b4a5e6
Create Date: 2026-08-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c1d2e3f4a5b6'
down_revision = 'f1d2c3b4a5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('Education', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('SocialActivities', sa.String(length=1000), nullable=True))


def downgrade():
    op.drop_column('users', 'SocialActivities')
    op.drop_column('users', 'Education')
