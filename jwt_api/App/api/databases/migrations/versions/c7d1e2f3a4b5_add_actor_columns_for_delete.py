"""add actor columns (shifts.created_by, crypto_keys.issued_by) for ownership-scoped delete

Revision ID: c7d1e2f3a4b5
Revises: a450f4555ea7
Create Date: 2026-11-03 09:35:00

Legacy rows are intentionally left NULL: we cannot know who originally started
the shift / generated the key, so only admins (or holders of *.delete.any)
may delete them. This is the secure default.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d1e2f3a4b5"
down_revision: Union[str, Sequence[str], None] = "a450f4555ea7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shifts", sa.Column("created_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_shifts_created_by_users", "shifts", "users",
        ["created_by"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_shifts_created_by", "shifts", ["created_by"])

    op.add_column("crypto_keys", sa.Column("issued_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_crypto_keys_issued_by_users", "crypto_keys", "users",
        ["issued_by"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_crypto_keys_issued_by", "crypto_keys", ["issued_by"])


def downgrade() -> None:
    op.drop_index("ix_crypto_keys_issued_by", table_name="crypto_keys")
    op.drop_constraint("fk_crypto_keys_issued_by_users", "crypto_keys", type_="foreignkey")
    op.drop_column("crypto_keys", "issued_by")

    op.drop_index("ix_shifts_created_by", table_name="shifts")
    op.drop_constraint("fk_shifts_created_by_users", "shifts", type_="foreignkey")
    op.drop_column("shifts", "created_by")
