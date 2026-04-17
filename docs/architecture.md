# Architecture

## Overview

PDF ToC Studio is structured as a shared PDF-processing core with two desktop shells:

- a runnable `Tkinter` desktop prototype for immediate use
- a `Tauri + React` shell for long-term product packaging

This lets us keep shipping functionality while the newer desktop shell matures.

## Layers

### 1. Shared Core

Path: [core/toc_engine.py](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/core/toc_engine.py)

Responsibilities:

- parse plain-text TOC input
- infer hierarchy from indentation
- map logical page numbers to physical PDF pages
- validate page ranges and hierarchy issues
- write bookmarks to PDF
- write page labels to PDF

Key functions:

- `parse_toc_text`
- `validate_entries`
- `format_preview_rows`
- `export_pdf_with_toc`

### 2. CLI Layer

Path: [core/cli.py](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/core/cli.py)

Responsibilities:

- preview parsed entries
- print validation warnings
- export output PDF through terminal commands

This is useful for testing, scripting, and batch workflows.

### 3. Python Bridge

Path: [core/bridge.py](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/core/bridge.py)

Responsibilities:

- accept JSON input
- execute preview or export actions
- return structured JSON output

This bridge allows the Tauri frontend to reuse the Python core without duplicating PDF logic.

### 4. Tk Desktop Shell

Path: [app/main.py](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/app/main.py)

Responsibilities:

- provide a desktop UI today
- allow manual path entry and TOC editing
- preview parsed mappings
- trigger export

This is the current working desktop app.

### 5. Tauri Shell

Paths:

- [frontend/src/App.tsx](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/frontend/src/App.tsx)
- [src-tauri/src/main.rs](/Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio/src-tauri/src/main.rs)

Responsibilities:

- provide a modern desktop UI
- invoke Rust commands from the frontend
- call the Python bridge from Rust

Current status:

- scaffolded
- frontend builds successfully
- Rust side still blocked by local Tauri dependency compatibility

## Data Flow

1. User loads PDF path, TOC text, and page offset.
2. UI calls preview or export.
3. Shared core parses and validates TOC input.
4. On export, the core writes bookmarks and page labels into a new PDF.
5. UI displays preview rows, validation warnings, and export status.

## Design Choices

### Why Python first

- The PDF workflow was already validated with PyMuPDF.
- Prototyping speed matters more than native purity at this stage.
- The same core can later be rewritten in Rust if distribution needs justify it.

### Why keep two shells

- Tkinter guarantees a working local desktop app now.
- Tauri keeps the product path open for a modern packaged desktop experience.

### Why a JSON bridge

- It isolates the frontend from PDF implementation details.
- It reduces duplicated business logic.
- It keeps migration options open.

