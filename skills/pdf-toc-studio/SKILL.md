---
name: pdf-toc-studio
description: Use this skill when you need to turn a plain-text table of contents into validated PDF bookmarks and logical page labels, preview logical-to-physical page mappings, or export a new bookmarked PDF from a source PDF plus TOC text or TOC file.
---

# PDF ToC Studio

Use this skill for PDF bookmark production workflows based on plain-text TOC input.

This package is designed to be model-agnostic. If the host platform supports native skill triggering, use the skill name directly. If it does not, use the script entry and pass the same inputs explicitly.

## When to use it

Use this skill when the user wants to:

- preview how TOC entries map from logical pages to physical PDF pages
- validate indentation-based TOC hierarchies
- export a PDF with bookmarks and page labels
- automate the workflow through a stable script or JSON bridge

## Inputs to gather

Collect these inputs before running:

- source PDF path
- TOC source, either inline text or a text file path
- output PDF path for export workflows
- page offset

If the user does not provide an output path for export, derive one next to the source PDF and mention the assumption.

## Workflow

1. Prefer preview before export unless the user explicitly wants direct export and the TOC source is already trusted.
2. Use the stable script entry for deterministic execution:
   [scripts/run_pdf_toc_studio.py](./scripts/run_pdf_toc_studio.py)
3. If the user provides inline TOC text, pass it with `--toc-text`.
4. If the user provides a TOC file, use `--toc-file`.
5. Summarize validation issues clearly:
   `warning` means review recommended; `error` means export should not proceed.

## Cross-model compatibility

Use one of these patterns depending on the model host:

- Native skill hosts:
  invoke `pdf-toc-studio` directly or use the platform's skill mention syntax
- General-purpose chat models:
  describe the workflow in plain language and instruct the model to run the script entry
- Tool-capable agents:
  call the script with explicit flags and read the JSON result

Recommended minimum contract:

- input:
  `source PDF`, `TOC text or TOC file`, `offset`, optional `output PDF`
- action:
  `preview` or `export`
- output:
  JSON with `ok`, parsed `entries` or `entryCount`, `issues`, and `outputPdf` for export

## Commands

Preview with inline TOC text:

```bash
python3 skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py \
  preview \
  --pdf /path/to/source.pdf \
  --toc-text $'Chapter 1 Introduction    1\n    1.1 Background    3' \
  --offset 8
```

Preview with a TOC file:

```bash
python3 skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py \
  preview \
  --pdf /path/to/source.pdf \
  --toc-file /path/to/toc.txt \
  --offset 8
```

Export:

```bash
python3 skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py \
  export \
  --pdf /path/to/source.pdf \
  --toc-file /path/to/toc.txt \
  --out /path/to/output.pdf \
  --offset 8
```

## Prompt templates

Codex or OpenAI-style skill hosts:

```text
Use $pdf-toc-studio to preview the TOC mapping for ./examples/source.pdf with offset 8 using the following TOC text: ...
```

Claude or Gemini-style general agents:

```text
Use the pdf-toc-studio workflow in this repository. Run the script skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py in preview mode for ./examples/source.pdf with offset 8 and summarize the JSON validation result.
```

Generic automation or orchestration layers:

```text
Run the repository script skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py with action=export, pdf=./examples/source.pdf, toc-file=./examples/toc.txt, out=./examples/output.pdf, offset=8. Return the JSON result and a one-paragraph summary.
```

## Response guidance

- Report parsed entry count when available.
- Report page-count overflow or invalid mappings as blocking issues.
- When export succeeds, include the output PDF path.
- Keep explanations short and operational.
