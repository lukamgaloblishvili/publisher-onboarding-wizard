"""initial postgres schema

Revision ID: 20260312_0001
Revises:
Create Date: 2026-03-12 18:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260312_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_role"), "user", ["role"], unique=False)
    op.create_index(op.f("ix_user_username"), "user", ["username"], unique=True)

    op.create_table(
        "publisher",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("slack_channel_embed_url", sa.String(), nullable=True),
        sa.Column("notification_emails_json", sa.String(), nullable=True),
        sa.Column("access_code_hash", sa.String(), nullable=True),
        sa.Column("access_code_last_rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resources_content_markdown", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_publisher_slug"), "publisher", ["slug"], unique=True)

    op.create_table(
        "campaign",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("publisher_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("campaign_type", sa.String(), nullable=False),
        sa.Column("checklist_json", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["publisher_id"], ["publisher.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_campaign_publisher_id"), "campaign", ["publisher_id"], unique=False)

    op.create_table(
        "campaignintegration",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("external_type", sa.String(), nullable=False),
        sa.Column("external_ticket_key", sa.String(), nullable=True),
        sa.Column("external_ticket_url", sa.String(), nullable=True),
        sa.Column("portal_status", sa.String(), nullable=False),
        sa.Column("external_status", sa.String(), nullable=True),
        sa.Column("frozen_description", sa.String(), nullable=True),
        sa.Column("frozen_description_html", sa.String(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaign.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("campaign_id"),
    )
    op.create_index(op.f("ix_campaignintegration_campaign_id"), "campaignintegration", ["campaign_id"], unique=True)

    op.create_table(
        "campaigncompliance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("external_type", sa.String(), nullable=False),
        sa.Column("external_item_id", sa.String(), nullable=True),
        sa.Column("external_ticket_url", sa.String(), nullable=True),
        sa.Column("portal_status", sa.String(), nullable=False),
        sa.Column("external_status", sa.String(), nullable=True),
        sa.Column("frozen_description", sa.String(), nullable=True),
        sa.Column("frozen_description_html", sa.String(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaign.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("campaign_id"),
    )
    op.create_index(op.f("ix_campaigncompliance_campaign_id"), "campaigncompliance", ["campaign_id"], unique=True)

    op.create_table(
        "message",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("formatted_body", sa.String(), nullable=True),
        sa.Column("attachment_url", sa.String(), nullable=True),
        sa.Column("attachment_name", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False),
        sa.Column("external_message_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_message_entity_id"), "message", ["entity_id"], unique=False)
    op.create_index(op.f("ix_message_entity_type"), "message", ["entity_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_message_entity_type"), table_name="message")
    op.drop_index(op.f("ix_message_entity_id"), table_name="message")
    op.drop_table("message")
    op.drop_index(op.f("ix_campaigncompliance_campaign_id"), table_name="campaigncompliance")
    op.drop_table("campaigncompliance")
    op.drop_index(op.f("ix_campaignintegration_campaign_id"), table_name="campaignintegration")
    op.drop_table("campaignintegration")
    op.drop_index(op.f("ix_campaign_publisher_id"), table_name="campaign")
    op.drop_table("campaign")
    op.drop_index(op.f("ix_publisher_slug"), table_name="publisher")
    op.drop_table("publisher")
    op.drop_index(op.f("ix_user_username"), table_name="user")
    op.drop_index(op.f("ix_user_role"), table_name="user")
    op.drop_table("user")
