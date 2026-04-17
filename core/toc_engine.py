from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Iterable

import fitz


@dataclass(frozen=True)
class ParsedEntry:
    level: int
    title: str
    logical_page: int
    physical_page: int
    line_number: int


@dataclass(frozen=True)
class ValidationIssue:
    level: str
    message: str
    line_number: int | None = None


def parse_toc_text(toc_text: str, page_offset: int) -> list[ParsedEntry]:
    entries: list[ParsedEntry] = []

    for line_number, raw_line in enumerate(toc_text.splitlines(), start=1):
        if not raw_line.strip():
            continue

        expanded = raw_line.expandtabs(4)
        indent_chars = len(expanded) - len(expanded.lstrip(" "))
        level = indent_chars // 4 + 1

        match = re.match(r"^\s*(.*?)\s+(\d+)\s*$", expanded)
        if not match:
            raise ValueError(f"Line {line_number} is invalid: {raw_line}")

        title = match.group(1).strip()
        logical_page = int(match.group(2))
        physical_page = logical_page + page_offset

        if not title:
            raise ValueError(f"Line {line_number} has an empty title")
        if logical_page < 1:
            raise ValueError(f"Line {line_number} has an invalid logical page: {logical_page}")
        if physical_page < 1:
            raise ValueError(f"Line {line_number} maps to an invalid physical page: {physical_page}")

        entries.append(
            ParsedEntry(
                level=level,
                title=title,
                logical_page=logical_page,
                physical_page=physical_page,
                line_number=line_number,
            )
        )

    if not entries:
        raise ValueError("TOC text is empty")

    return entries


def validate_entries(entries: Iterable[ParsedEntry], pdf_page_count: int | None = None) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    prev_entry: ParsedEntry | None = None

    for entry in entries:
        if prev_entry is not None:
            if entry.level > prev_entry.level + 1:
                issues.append(
                    ValidationIssue(
                        level="warning",
                        line_number=entry.line_number,
                        message=f"Level jumps from {prev_entry.level} to {entry.level}",
                    )
                )
            if entry.logical_page < prev_entry.logical_page:
                issues.append(
                    ValidationIssue(
                        level="warning",
                        line_number=entry.line_number,
                        message="Logical page goes backwards",
                    )
                )

        if pdf_page_count is not None and entry.physical_page > pdf_page_count:
            issues.append(
                ValidationIssue(
                    level="error",
                    line_number=entry.line_number,
                    message=f"Physical page {entry.physical_page} exceeds PDF page count {pdf_page_count}",
                )
            )

        prev_entry = entry

    return issues


def format_preview_rows(entries: Iterable[ParsedEntry], limit: int = 20) -> list[str]:
    rows: list[str] = []
    for index, entry in enumerate(entries):
        if index >= limit:
            rows.append("...")
            break
        rows.append(
            f"L{entry.level} | {entry.title} | logical {entry.logical_page} -> physical {entry.physical_page}"
        )
    return rows


def _build_toc(entries: Iterable[ParsedEntry]) -> list[list[int | str]]:
    return [[entry.level, entry.title, entry.physical_page] for entry in entries]


def _build_page_labels(page_offset: int) -> list[dict[str, int | str]]:
    if page_offset <= 0:
        return [{"startpage": 0, "prefix": "", "style": "D", "firstpagenum": 1}]

    return [
        {"startpage": 0, "prefix": "", "style": "", "firstpagenum": 1},
        {"startpage": page_offset, "prefix": "", "style": "D", "firstpagenum": 1},
    ]


def export_pdf_with_toc(
    source_pdf: str | Path,
    output_pdf: str | Path,
    toc_text: str,
    page_offset: int,
) -> tuple[list[ParsedEntry], list[ValidationIssue]]:
    source_pdf = Path(source_pdf)
    output_pdf = Path(output_pdf)
    entries = parse_toc_text(toc_text, page_offset)

    with fitz.open(source_pdf) as doc:
        issues = validate_entries(entries, pdf_page_count=doc.page_count)
        fatal_errors = [issue for issue in issues if issue.level == "error"]
        if fatal_errors:
            messages = "; ".join(issue.message for issue in fatal_errors)
            raise ValueError(messages)

        doc.set_toc(_build_toc(entries))
        doc.set_page_labels(_build_page_labels(page_offset))
        doc.save(output_pdf)

    return entries, issues
