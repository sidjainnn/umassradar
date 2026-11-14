"""Deterministic sender parsers. Each module exposes NAME, matches(msg) and parse(msg) -> list[Item]."""

from parsers import campuswire, canvas, gradescope, handshake, navigate, piazza, reslife

PARSERS = [piazza, campuswire, gradescope, canvas, handshake, navigate, reslife]


def find_parser(msg):
    for parser in PARSERS:
        if parser.matches(msg):
            return parser
    return None
