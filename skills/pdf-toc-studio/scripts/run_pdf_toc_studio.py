from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.bridge import export_payload, preview_payload


def _load_toc_text(args: argparse.Namespace) -> str:
    if args.toc_text:
        return args.toc_text
    if args.toc_file:
        return Path(args.toc_file).read_text(encoding="utf-8")
    raise ValueError("Either --toc-text or --toc-file is required")


def _build_payload(args: argparse.Namespace) -> dict[str, object]:
    payload: dict[str, object] = {
        "sourcePdf": args.pdf,
        "tocText": _load_toc_text(args),
        "offset": args.offset,
    }
    if args.command == "export":
        payload["outputPdf"] = args.out
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Stable script entry for the PDF ToC Studio skill."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    def add_common_arguments(command_parser: argparse.ArgumentParser) -> None:
        command_parser.add_argument("--pdf", required=True, help="Source PDF path")
        command_parser.add_argument("--toc-text", help="Inline TOC text")
        command_parser.add_argument("--toc-file", help="TOC text file path")
        command_parser.add_argument("--offset", type=int, default=0, help="Logical to physical page offset")

    preview_parser = subparsers.add_parser("preview", help="Preview TOC parsing and validation")
    add_common_arguments(preview_parser)

    export_parser = subparsers.add_parser("export", help="Export a bookmarked PDF")
    add_common_arguments(export_parser)
    export_parser.add_argument("--out", required=True, help="Output PDF path")

    args = parser.parse_args()

    try:
        payload = _build_payload(args)
        if args.command == "preview":
            result = preview_payload(payload)
        else:
            result = export_payload(payload)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
