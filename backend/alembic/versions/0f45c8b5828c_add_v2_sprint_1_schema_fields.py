"""Add V2 Sprint 1 schema fields

Revision ID: 0f45c8b5828c
Revises: 953e0b5335ad
Create Date: 2026-02-24 15:32:48.730338

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f45c8b5828c'
down_revision: Union[str, None] = '953e0b5335ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy.dialects import postgresql
    op.add_column('lore_items', sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=True))
    op.add_column('outlines', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.add_column('chapter_snapshots', sa.Column('snapshot_type', sa.String(), server_default='manual', nullable=False))
    op.create_index(op.f('ix_chapter_snapshots_snapshot_type'), 'chapter_snapshots', ['snapshot_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chapter_snapshots_snapshot_type'), table_name='chapter_snapshots')
    op.drop_column('chapter_snapshots', 'snapshot_type')
    op.drop_column('outlines', 'version')
    op.drop_column('lore_items', 'tags')
