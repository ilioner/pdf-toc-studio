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


@dataclass(frozen=True)
class SplitResult:
    label: str
    start_page: int
    end_page: int
    output_pdf: str


@dataclass(frozen=True)
class ExtractedImageResult:
    page_number: int
    image_index: int
    title: str | None
    width: int
    height: int
    extension: str
    output_path: str


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


@dataclass(frozen=True)
class _SplitPlan:
    label: str
    start_page: int
    end_page: int
    entries: list[ParsedEntry] | None = None


def _sanitize_filename_part(value: str) -> str:
    cleaned = re.sub(r"[^\w\-]+", "-", value.strip(), flags=re.UNICODE)
    cleaned = cleaned.strip("-_")
    return cleaned or "segment"


def _extract_image_object_title(image: tuple) -> str | None:
    for value in image[7:]:
        if isinstance(value, str):
            candidate = value.strip()
            if candidate and not candidate.lower().startswith("fzimg"):
                return candidate
    return None


def _match_caption_title(text: str) -> str | None:
    normalized = " ".join(text.split())
    patterns = [
        r"^(图\s*\d+(?:[-.]\d+)*[:：.、]?\s*.+)$",
        r"^(表\s*\d+(?:[-.]\d+)*[:：.、]?\s*.+)$",
        r"^((?:Figure|Fig\.?)\s*\d+(?:[-.]\d+)*[:：.、]?\s*.+)$",
    ]
    for pattern in patterns:
        match = re.match(pattern, normalized, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _horizontal_overlap_ratio(a: fitz.Rect, b: fitz.Rect) -> float:
    overlap = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    width = max(1.0, min(a.width, b.width))
    return overlap / width


def _extract_caption_title(page: fitz.Page, image_rect: fitz.Rect) -> str | None:
    blocks = page.get_text("blocks", sort=True)
    candidates: list[tuple[float, str]] = []

    for block in blocks:
        block_rect = fitz.Rect(block[:4])
        text = str(block[4]).strip()
        if not text:
            continue
        if _horizontal_overlap_ratio(image_rect, block_rect) < 0.35:
            continue

        is_below = 0 <= block_rect.y0 - image_rect.y1 <= 96
        is_above = 0 <= image_rect.y0 - block_rect.y1 <= 64
        if not (is_below or is_above):
            continue

        caption = _match_caption_title(text)
        if caption:
            distance = min(abs(block_rect.y0 - image_rect.y1), abs(image_rect.y0 - block_rect.y1))
            candidates.append((distance, caption))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def _build_output_filename(index: int, plan: _SplitPlan) -> str:
    safe_label = _sanitize_filename_part(plan.label)
    if plan.start_page == plan.end_page:
        return f"{index:03d}-{safe_label}-p{plan.start_page:04d}.pdf"
    return f"{index:03d}-{safe_label}-p{plan.start_page:04d}-{plan.end_page:04d}.pdf"


def _build_relative_toc(entries: list[ParsedEntry], segment_start_page: int) -> list[list[int | str]]:
    if not entries:
        return []

    base_level = entries[0].level
    relative_toc: list[list[int | str]] = []
    for entry in entries:
        relative_toc.append(
            [
                entry.level - base_level + 1,
                entry.title,
                entry.physical_page - segment_start_page + 1,
            ]
        )
    return relative_toc


def _plan_page_segments(pdf_page_count: int) -> list[_SplitPlan]:
    return [
        _SplitPlan(label=f"page-{page_number}", start_page=page_number, end_page=page_number)
        for page_number in range(1, pdf_page_count + 1)
    ]


def _is_supplementary_entry(title: str) -> bool:
    normalized = re.sub(r"\s+", "", title)
    return normalized in {"思考题", "参考文献", "exercises", "references"}


def _plan_chapter_segments(
    entries: list[ParsedEntry],
    pdf_page_count: int,
    split_level: int = 1,
    include_supplementary: bool = True,
) -> list[_SplitPlan]:
    top_level_positions = [
        index
        for index, entry in enumerate(entries)
        if entry.level == split_level and (include_supplementary or not _is_supplementary_entry(entry.title))
    ]
    if not top_level_positions:
        raise ValueError(f"Chapter split requires at least one level-{split_level} TOC entry")

    plans: list[_SplitPlan] = []
    for position_index, start_index in enumerate(top_level_positions):
        next_start_index = top_level_positions[position_index + 1] if position_index + 1 < len(top_level_positions) else len(entries)
        segment_entries = entries[start_index:next_start_index]
        top_entry = segment_entries[0]
        next_start_page = entries[next_start_index].physical_page if next_start_index < len(entries) else pdf_page_count + 1
        end_page = max(top_entry.physical_page, next_start_page - 1)
        plans.append(
            _SplitPlan(
                label=top_entry.title,
                start_page=top_entry.physical_page,
                end_page=end_page,
                entries=segment_entries,
            )
        )

    return plans


def _parse_range_token(token: str, default_label: str) -> _SplitPlan:
    label = default_label
    range_text = token.strip()
    if ":" in range_text:
        possible_label, possible_range = range_text.split(":", 1)
        label = possible_label.strip() or default_label
        range_text = possible_range.strip()

    match = re.fullmatch(r"(\d+)\s*-\s*(\d+)", range_text)
    if not match:
        raise ValueError(f"Invalid split range: {token}")

    start_page = int(match.group(1))
    end_page = int(match.group(2))
    if start_page < 1 or end_page < start_page:
        raise ValueError(f"Invalid split range: {token}")

    return _SplitPlan(label=label, start_page=start_page, end_page=end_page)


def _plan_custom_segments(ranges_text: str, pdf_page_count: int) -> list[_SplitPlan]:
    raw_tokens = [token.strip() for token in re.split(r"[\n,]+", ranges_text) if token.strip()]
    if not raw_tokens:
        raise ValueError("Custom split ranges are empty")

    plans: list[_SplitPlan] = []
    for index, token in enumerate(raw_tokens, start=1):
        plan = _parse_range_token(token, default_label=f"range-{index}")
        if plan.end_page > pdf_page_count:
            raise ValueError(f"Split range exceeds PDF page count: {token}")
        plans.append(plan)
    return plans


def split_pdf(
    source_pdf: str | Path,
    output_dir: str | Path,
    mode: str,
    toc_text: str = "",
    page_offset: int = 0,
    ranges_text: str = "",
    split_level: int = 1,
    include_supplementary: bool = True,
) -> tuple[list[SplitResult], list[ValidationIssue]]:
    source_pdf = Path(source_pdf)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with fitz.open(source_pdf) as doc:
        page_count = doc.page_count
        issues: list[ValidationIssue] = []

        if mode == "page":
            plans = _plan_page_segments(page_count)
        elif mode == "chapter":
            entries = parse_toc_text(toc_text, page_offset)
            issues = validate_entries(entries, pdf_page_count=page_count)
            fatal_errors = [issue for issue in issues if issue.level == "error"]
            if fatal_errors:
                messages = "; ".join(issue.message for issue in fatal_errors)
                raise ValueError(messages)
            plans = _plan_chapter_segments(
                entries,
                page_count,
                split_level=split_level,
                include_supplementary=include_supplementary,
            )
        elif mode == "range":
            plans = _plan_custom_segments(ranges_text, page_count)
        else:
            raise ValueError(f"Unsupported split mode: {mode}")

        results: list[SplitResult] = []
        for index, plan in enumerate(plans, start=1):
            segment_pdf = fitz.open()
            segment_pdf.insert_pdf(doc, from_page=plan.start_page - 1, to_page=plan.end_page - 1)
            relative_toc = _build_relative_toc(plan.entries or [], plan.start_page)
            if relative_toc:
                segment_pdf.set_toc(relative_toc)
            segment_pdf.set_page_labels([{"startpage": 0, "prefix": "", "style": "D", "firstpagenum": 1}])

            output_pdf = output_dir / _build_output_filename(index, plan)
            segment_pdf.save(output_pdf)
            segment_pdf.close()

            results.append(
                SplitResult(
                    label=plan.label,
                    start_page=plan.start_page,
                    end_page=plan.end_page,
                    output_pdf=str(output_pdf),
                )
            )

    return results, issues


def extract_pdf_images(
    source_pdf: str | Path,
    output_dir: str | Path,
    min_width: int = 0,
    min_height: int = 0,
    min_bytes: int = 0,
    require_title: bool = False,
) -> list[ExtractedImageResult]:
    source_pdf = Path(source_pdf)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: list[ExtractedImageResult] = []
    seen_xrefs: set[int] = set()

    with fitz.open(source_pdf) as doc:
        for page_number, page in enumerate(doc, start=1):
            image_refs = page.get_images(full=True)
            page_image_index = 0

            for image in image_refs:
                xref = image[0]
                if xref in seen_xrefs:
                    continue

                image_data = doc.extract_image(xref)
                width = int(image_data.get("width", 0))
                height = int(image_data.get("height", 0))
                image_bytes = image_data["image"]
                if width < min_width or height < min_height or len(image_bytes) < min_bytes:
                    seen_xrefs.add(xref)
                    continue

                image_rects = page.get_image_rects(xref)
                object_title = _extract_image_object_title(image)
                caption_title = None
                for image_rect in image_rects:
                    caption_title = _extract_caption_title(page, image_rect)
                    if caption_title:
                        break
                resolved_title = caption_title or object_title
                if require_title and not resolved_title:
                    seen_xrefs.add(xref)
                    continue

                seen_xrefs.add(xref)
                page_image_index += 1
                extension = image_data.get("ext", "png")
                base_name = (
                    f"page-{page_number:04d}-{_sanitize_filename_part(resolved_title)}"
                    if resolved_title
                    else f"page-{page_number:04d}-img-{page_image_index:02d}-xref-{xref}"
                )
                output_path = output_dir / f"{base_name}.{extension}"
                output_path.write_bytes(image_bytes)

                results.append(
                    ExtractedImageResult(
                        page_number=page_number,
                        image_index=page_image_index,
                        title=resolved_title,
                        width=width,
                        height=height,
                        extension=extension,
                        output_path=str(output_path),
                    )
                )

    return results
