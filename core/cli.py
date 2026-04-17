from __future__ import annotations

import argparse
from pathlib import Path
import sys

from .toc_engine import export_pdf_with_toc, format_preview_rows, parse_toc_text, validate_entries


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a PDF with bookmarks and page labels from plain-text TOC.")
    parser.add_argument("--pdf", required=True, help="Source PDF path")
    parser.add_argument("--toc", required=True, help="TOC text file path")
    parser.add_argument("--out", required=True, help="Output PDF path")
    parser.add_argument("--offset", type=int, default=0, help="Physical page offset for logical page 1")
    parser.add_argument("--preview", action="store_true", help="Only preview parsed entries and validation results")
    args = parser.parse_args()

    toc_text = Path(args.toc).read_text(encoding="utf-8")
    entries = parse_toc_text(toc_text, args.offset)

    page_count = None
    if Path(args.pdf).exists():
        import fitz

        with fitz.open(args.pdf) as doc:
            page_count = doc.page_count

    issues = validate_entries(entries, pdf_page_count=page_count)

    for row in format_preview_rows(entries):
        print(row)

    if issues:
        print("\nValidation:")
        for issue in issues:
            location = f"line {issue.line_number}" if issue.line_number else "general"
            print(f"- {issue.level.upper()} {location}: {issue.message}")

    if args.preview:
        return 0

    export_pdf_with_toc(args.pdf, args.out, toc_text, args.offset)
    print(f"\nExported: {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
