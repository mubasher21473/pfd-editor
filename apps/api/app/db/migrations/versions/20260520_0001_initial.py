"""initial schema

Revision ID: 20260520_0001
Revises:
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260520_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    subscription_tier = sa.Enum("free", "pro", "team", name="subscriptiontier")
    object_type = sa.Enum("text", "path", "image", "form_xobject", name="objecttype")
    edit_status = sa.Enum("pending", "processing", "done", "failed", name="editstatus")

    subscription_tier.create(op.get_bind(), checkfirst=True)
    object_type.create(op.get_bind(), checkfirst=True)
    edit_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="email"),
        sa.Column("tier", subscription_tier, nullable=False, server_default="free"),
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
        sa.Column("uploads_this_month", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "uploads_reset_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("date_trunc('month', now())"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "pdf_files",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column(
            "user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("original_name", sa.String(length=512), nullable=False),
        sa.Column("s3_key", sa.String(length=1024), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("parse_status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "pdf_objects",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column(
            "file_id", sa.UUID(), sa.ForeignKey("pdf_files.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("page_index", sa.Integer(), nullable=False),
        sa.Column("object_type", object_type, nullable=False),
        sa.Column("stream_index", sa.Integer(), nullable=True),
        sa.Column("x", sa.Float(), nullable=True),
        sa.Column("y", sa.Float(), nullable=True),
        sa.Column("width", sa.Float(), nullable=True),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("fill_color", sa.String(length=7), nullable=True),
        sa.Column("stroke_color", sa.String(length=7), nullable=True),
        sa.Column("font_name", sa.String(length=255), nullable=True),
        sa.Column("font_size", sa.Float(), nullable=True),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("raw_attrs", sa.JSON(), nullable=True),
    )

    op.create_table(
        "edit_operations",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column(
            "file_id", sa.UUID(), sa.ForeignKey("pdf_files.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("operation", sa.JSON(), nullable=False),
        sa.Column(
            "applied_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "exports",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column(
            "file_id", sa.UUID(), sa.ForeignKey("pdf_files.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("s3_key", sa.String(length=1024), nullable=True),
        sa.Column("status", edit_status, nullable=False, server_default="pending"),
        sa.Column("download_url", sa.String(length=2048), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("idx_pdf_objects_file_id", "pdf_objects", ["file_id"])
    op.create_index("idx_pdf_objects_fill_color", "pdf_objects", ["fill_color"])
    op.create_index("idx_pdf_objects_type", "pdf_objects", ["object_type"])


def downgrade() -> None:
    op.drop_index("idx_pdf_objects_type", table_name="pdf_objects")
    op.drop_index("idx_pdf_objects_fill_color", table_name="pdf_objects")
    op.drop_index("idx_pdf_objects_file_id", table_name="pdf_objects")
    op.drop_table("exports")
    op.drop_table("edit_operations")
    op.drop_table("pdf_objects")
    op.drop_table("pdf_files")
    op.drop_table("users")
