from __future__ import annotations

import json
from pathlib import Path
import sys

from .toc_engine import extract_pdf_images, export_pdf_with_toc, format_preview_rows, parse_toc_text, split_pdf, validate_entries


def _load_pdf_page_count(source_pdf: str | Path) -> int | None:
    import fitz

    source_pdf = Path(source_pdf)
    if not source_pdf.exists():
        return None

    with fitz.open(source_pdf) as doc:
        return doc.page_count


def preview_payload(payload: dict) -> dict:
    source_pdf = payload.get("sourcePdf", "")
    toc_text = payload.get("tocText", "")
    offset = int(payload.get("offset", 0))

    entries = parse_toc_text(toc_text, offset)
    page_count = _load_pdf_page_count(source_pdf) if source_pdf else None
    issues = validate_entries(entries, pdf_page_count=page_count)

    return {
        "ok": True,
        "entries": [
            {
                "level": entry.level,
                "title": entry.title,
                "logicalPage": entry.logical_page,
                "physicalPage": entry.physical_page,
                "lineNumber": entry.line_number,
            }
            for entry in entries
        ],
        "previewRows": format_preview_rows(entries, limit=50),
        "issues": [
            {
                "level": issue.level,
                "message": issue.message,
                "lineNumber": issue.line_number,
            }
            for issue in issues
        ],
        "pageCount": page_count,
    }


def export_payload(payload: dict) -> dict:
    source_pdf = payload.get("sourcePdf", "")
    output_pdf = payload.get("outputPdf", "")
    toc_text = payload.get("tocText", "")
    offset = int(payload.get("offset", 0))

    entries, issues = export_pdf_with_toc(source_pdf, output_pdf, toc_text, offset)

    return {
        "ok": True,
        "outputPdf": output_pdf,
        "entryCount": len(entries),
        "issues": [
            {
                "level": issue.level,
                "message": issue.message,
                "lineNumber": issue.line_number,
            }
            for issue in issues
        ],
    }


def split_payload(payload: dict) -> dict:
    source_pdf = payload.get("sourcePdf", "")
    output_dir = payload.get("outputDir", "")
    toc_text = payload.get("tocText", "")
    offset = int(payload.get("offset", 0))
    split_mode = payload.get("splitMode", "")
    ranges_text = payload.get("rangesText", "")
    split_level = int(payload.get("splitLevel", 1))
    include_supplementary = bool(payload.get("includeSupplementary", True))

    segments, issues = split_pdf(
        source_pdf=source_pdf,
        output_dir=output_dir,
        mode=split_mode,
        toc_text=toc_text,
        page_offset=offset,
        ranges_text=ranges_text,
        split_level=split_level,
        include_supplementary=include_supplementary,
    )

    return {
        "ok": True,
        "outputDir": output_dir,
        "segmentCount": len(segments),
        "segments": [
            {
                "label": segment.label,
                "startPage": segment.start_page,
                "endPage": segment.end_page,
                "outputPdf": segment.output_pdf,
            }
            for segment in segments
        ],
        "issues": [
            {
                "level": issue.level,
                "message": issue.message,
                "lineNumber": issue.line_number,
            }
            for issue in issues
        ],
    }


def extract_images_payload(payload: dict) -> dict:
    source_pdf = payload.get("sourcePdf", "")
    output_dir = payload.get("outputDir", "")
    min_width = int(payload.get("minWidth", 0))
    min_height = int(payload.get("minHeight", 0))
    min_bytes = int(payload.get("minBytes", 0))

    images = extract_pdf_images(
        source_pdf,
        output_dir,
        min_width=min_width,
        min_height=min_height,
        min_bytes=min_bytes,
    )

    return {
        "ok": True,
        "outputDir": output_dir,
        "imageCount": len(images),
        "images": [
            {
                "pageNumber": image.page_number,
                "imageIndex": image.image_index,
                "width": image.width,
                "height": image.height,
                "extension": image.extension,
                "outputPath": image.output_path,
            }
            for image in images
        ],
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        action = payload.get("action")

        if action == "preview":
            result = preview_payload(payload)
        elif action == "export":
            result = export_payload(payload)
        elif action == "split":
            result = split_payload(payload)
        elif action == "extract_images":
            result = extract_images_payload(payload)
        else:
            raise ValueError(f"Unsupported action: {action}")

        json.dump(result, sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        return 0
    except Exception as exc:
        json.dump({"ok": False, "error": str(exc)}, sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
