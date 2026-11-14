"""Email -> items. Pure-ish functions; storage lives in app/store.py.

Order: skip sent-only mail -> sender parser -> noise rule -> LLM for anything left -> merge -> rank.
"""

from dataclasses import dataclass, field

from app.merge import merge_items
from app.models import EmailMsg, Item
from app.ranking import urgency
from llm.extract import extract_items
from parsers import find_parser
from parsers.noise import is_noise, noise_item


@dataclass
class RuleResult:
    items: list[Item] = field(default_factory=list)
    needs_llm: list[EmailMsg] = field(default_factory=list)


def apply_rules(msg: EmailMsg) -> tuple[list[Item], bool]:
    """Returns (items, needs_llm)."""
    if "SENT" in msg.label_ids and "INBOX" not in msg.label_ids:
        return [], False  # the student's own outgoing mail
    parser = find_parser(msg)
    if parser:
        items = parser.parse(msg)
        if items is not None:
            return items, False
        return [], True  # parser recognized the sender but wants the LLM to read this one
    if is_noise(msg) or "CATEGORY_SOCIAL" in msg.label_ids:
        return [noise_item(msg)], False
    return [], True


def run_rules(msgs: list[EmailMsg]) -> RuleResult:
    result = RuleResult()
    for msg in msgs:
        items, needs_llm = apply_rules(msg)
        result.items.extend(items)
        if needs_llm:
            result.needs_llm.append(msg)
    return result


def finalize(items: list[Item], user_id: str) -> list[Item]:
    for item in items:
        item.user_id = user_id
        item.urgency_score = urgency(item)
    return merge_items(items)


async def process_emails(
    msgs: list[EmailMsg],
    user_id: str,
    use_llm: bool = True,
    generate=None,
    cache_user: str | None = None,
    failed: list[EmailMsg] | None = None,
) -> list[Item]:
    result = run_rules(msgs)
    items = list(result.items)
    if use_llm and result.needs_llm:
        # cache_user lets every demo visitor share one LLM cache for the (identical) demo emails
        items += await extract_items(result.needs_llm, cache_user or user_id, generate=generate, failed=failed)
    return finalize(items, user_id)
