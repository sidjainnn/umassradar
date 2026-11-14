"""Email -> items. Pure functions only; storage lives in app/store.py.

Order: sender parser -> noise rule -> (later) LLM for anything left over.
"""

from dataclasses import dataclass, field

from app.models import EmailMsg, Item
from parsers import find_parser
from parsers.noise import is_noise, noise_item


@dataclass
class RuleResult:
    items: list[Item] = field(default_factory=list)
    needs_llm: list[EmailMsg] = field(default_factory=list)


def apply_rules(msg: EmailMsg) -> tuple[list[Item], bool]:
    """Returns (items, needs_llm)."""
    parser = find_parser(msg)
    if parser:
        return parser.parse(msg), False
    if is_noise(msg):
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


async def process_emails(msgs: list[EmailMsg], user_id: str) -> list[Item]:
    result = run_rules(msgs)
    for item in result.items:
        item.user_id = user_id
    return result.items
