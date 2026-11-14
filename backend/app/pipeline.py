"""Email -> items. Pure functions only; storage lives in app/store.py."""

from app.gmail_client import gmail_link
from app.models import EmailMsg, Item


def process_email(msg: EmailMsg) -> list[Item]:
    # Phase 1: one placeholder item per email so sync can be verified end to end.
    return [
        Item(
            category="course_info",
            title=msg.subject or "(no subject)",
            source="gmail",
            source_ref=msg.id,
            evidence=msg.subject,
            confidence=0.1,
            sender=msg.from_name or msg.from_email,
            received_at=msg.date,
            url=gmail_link(msg.id),
        )
    ]


async def process_emails(msgs: list[EmailMsg], user_id: str) -> list[Item]:
    items: list[Item] = []
    for msg in msgs:
        for item in process_email(msg):
            item.user_id = user_id
            items.append(item)
    return items
