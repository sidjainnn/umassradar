"""Noise rule: promotions, or bulk mail from senders that aren't academic."""

from app.models import EmailMsg, Item
from parsers.common import make_item

ACADEMIC_DOMAINS = (
    "umass.edu",
    "piazza.com",
    "campuswire.com",
    "campuswiremail.com",
    "gradescope.com",
    "instructure.com",
    "joinhandshake.com",
    "eab.com",
    "hackumass.com",
)


def is_academic(msg: EmailMsg) -> bool:
    domain = msg.from_domain
    return any(domain == d or domain.endswith("." + d) for d in ACADEMIC_DOMAINS) or "umass" in domain


def is_noise(msg: EmailMsg) -> bool:
    if "CATEGORY_PROMOTIONS" in msg.label_ids:
        return True
    return bool(msg.list_unsubscribe) and not is_academic(msg)


def noise_item(msg: EmailMsg) -> Item:
    return make_item(msg, "noise", msg.subject or "(no subject)", confidence=0.95, sender_type="newsletter")
