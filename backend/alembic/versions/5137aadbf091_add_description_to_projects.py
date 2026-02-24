"""Add description to projects

Revision ID: 5137aadbf091
Revises: 0f45c8b5828c
Create Date: 2026-02-24 16:46:55.648765

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5137aadbf091'
down_revision: Union[str, None] = '0f45c8b5828c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('description', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('projects', 'description')
