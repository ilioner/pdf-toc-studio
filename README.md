# PDF ToC Studio

Cross-platform desktop software for importing a plain-text table of contents, mapping it onto the physical pages of a PDF, and exporting a new PDF with bookmarks and page labels.

## Current Status

The repository now contains a dual-stack MVP:

- `Python + Tkinter + PyMuPDF` for a runnable desktop prototype today
- `Tauri + React + Python bridge` scaffolding for the next-generation desktop shell

It already supports:

- importing a source PDF
- pasting or loading plain-text TOC content
- parsing heading levels from indentation
- mapping logical page numbers to physical PDF pages with an offset
- writing PDF bookmarks
- writing PDF page labels
- previewing parsed mappings and validation results
- returning JSON results through a Python bridge for Tauri

## Quick Start

### Launch the Tk desktop app

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
python3 launch.py
```

### Run the CLI

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
python3 -m core.cli --pdf ../航空电子技术（正文）.pdf --toc ../toc.txt --out ../pdf-toc-studio-output.pdf --offset 8
```

### Preview only

```bash
python3 -m core.cli --pdf ../航空电子技术（正文）.pdf --toc ../toc.txt --out ../pdf-toc-studio-output.pdf --offset 8 --preview
```

### Test the Tauri bridge directly

```bash
python3 -m core.bridge <<'EOF'
{"action":"preview","sourcePdf":"../航空电子技术（正文）.pdf","tocText":"第1章 概述    1","offset":8}
EOF
```

## Tauri Layout

- `frontend/`
  React + Vite UI.
- `src-tauri/`
  Tauri shell and Rust command bridge.
- `core/bridge.py`
  JSON bridge used by Tauri to call the existing Python core.

The current Tauri plan is:

1. Tauri frontend collects file paths, TOC text, and offset.
2. Rust command invokes `python3 -m core.bridge`.
3. The Python bridge calls the shared TOC engine.
4. JSON response goes back to the frontend for preview or export status.

## Expected Tauri Startup Flow

After installing frontend and Tauri dependencies, the intended commands are:

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/frontend
npm install
```

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
npx tauri dev
```

I have added the project structure and bridge contract, but I have not run the full Tauri app yet because this workspace has not installed the frontend / Tauri npm dependencies.

## Workflow

1. Choose a source PDF.
2. Paste or import a TOC text block.
3. Set the page offset.
4. Preview logical page to physical page mapping.
5. Export a new PDF with bookmarks and page labels.

If logical page `1` starts at PDF page `9`, use offset `8`.

## Project Structure

- `app/main.py`
  Tkinter desktop UI.
- `core/toc_engine.py`
  TOC parsing, validation, bookmark generation, and page label generation.
- `core/bridge.py`
  JSON bridge for Tauri-to-Python communication.
- `core/cli.py`
  Command-line interface for preview and export.
- `frontend/`
  React + Vite frontend scaffold for Tauri.
- `src-tauri/`
  Rust shell for Tauri commands.
- `launch.py`
  Desktop app entry point.
- `docs/`
  Product and planning documents.

## Documentation

- [Product Requirements](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/docs/product-requirements.md)
- [Architecture](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/docs/architecture.md)
- [Development Guide](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/docs/development.md)
- [Roadmap](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/docs/roadmap.md)
- [MVP Plan](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/docs/mvp-plan.md)

## Suggested Next Product Steps

1. Install npm and Tauri frontend dependencies and verify `npx tauri dev`.
2. Add file-picker integration in the React frontend.
3. Add editable TOC tree view.
4. Add embedded PDF preview.
5. Package both Tk and Tauri variants for distribution.
