# Product Requirements

## Product Name

PDF ToC Studio

## Problem

Users often have a PDF whose visible page numbering starts after several cover, copyright, or preface pages. They also have a plain-text table of contents where page numbers are logical page numbers, not physical PDF page indexes.

Existing tools can write bookmarks, but they usually expect machine-formatted input and do not help users:

- convert human TOC text into importable data
- align logical page numbers with physical PDF pages
- keep displayed page labels consistent with the book's printed numbering

## Target User

- Teachers and publishers
- Students organizing textbooks
- Editors and archivists
- Anyone cleaning up scanned or exported PDFs

## Core User Story

As a user, I want to import a PDF and a plain-text TOC, tell the software that logical page 1 starts on physical PDF page N, and export a new PDF where:

- bookmarks jump to the correct physical pages
- the PDF viewer displays logical page labels starting from 1

## MVP Features

### 1. PDF Input

- Open local PDF
- Show file name, page count, and file size

### 2. TOC Input

- Import `.txt`
- Paste TOC text manually
- Preserve indentation and line breaks

### 3. TOC Parsing

- Detect hierarchy from indentation
- Detect title and logical page number
- Support common formats like:
  - `第1章 概述    1`
  - `    1.1 航空电子的基本内涵    1`
- Report invalid lines

### 4. Page Mapping

- Set logical page 1 -> physical PDF page N
- Preview conversion examples
- Validate page range overflow

### 5. PDF Output

- Write bookmarks
- Write page labels
- Export to a new file

### 6. Verification

- Preview first few mapped entries
- Highlight suspicious entries

## Nice-to-Have Features

- Editable TOC tree
- Drag-and-drop reorder
- OCR-assisted TOC extraction
- Auto-detect printed page numbers
- Multiple page label schemes
- Batch processing
- Command-line mode
- Project save/load

## Non-Functional Requirements

- Cross-platform: macOS, Windows, Linux
- Keep original PDF unchanged
- Handle large PDFs reliably
- UI in Chinese first, English later
- Fast feedback for parsing and mapping

## Open Product Decisions

- Whether to use Python core first or go directly to Rust
- Whether MVP needs embedded PDF preview or only validation text
- Whether project files should be saved for later re-editing

