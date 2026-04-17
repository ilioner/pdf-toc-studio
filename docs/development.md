# Development Guide

## Environment

Validated locally with:

- Python `3.10`
- PyMuPDF `1.26.x`
- Node `23.9.0`
- npm `10.9.2`
- Rust `1.87.0`

## Install Python dependency

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
pip install -r requirements.txt
```

## Run the Tk desktop app

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
python3 launch.py
```

## Run the CLI preview

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
python3 -m core.cli --pdf ../航空电子技术（正文）.pdf --toc ../toc.txt --out ../pdf-toc-studio-output.pdf --offset 8 --preview
```

## Run the CLI export

```bash
python3 -m core.cli --pdf ../航空电子技术（正文）.pdf --toc ../toc.txt --out ../pdf-toc-studio-output.pdf --offset 8
```

## Run the frontend build

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
npm install
cd frontend
npm install
cd ..
npm run frontend:build
```

## Test the Python bridge

```bash
cd /Users/tywin/Downloads/test/航空电子技术/pdf-toc-studio
python3 -m core.bridge <<'EOF'
{"action":"preview","sourcePdf":"../航空电子技术（正文）.pdf","tocText":"第1章 概述    1","offset":8}
EOF
```

## Tauri Status

The Tauri-compatible structure is present, but the Rust build is currently blocked by crate compatibility in this local environment.

What is already verified:

- frontend dependencies install
- frontend production build succeeds
- Python bridge preview succeeds
- Python bridge export succeeds

What is not yet verified:

- `cargo check`
- `tauri dev`
- final Tauri desktop window

## Suggested Next Development Tasks

1. Resolve Tauri crate compatibility with the local Rust toolchain.
2. Add file-pickers to both desktop shells.
3. Add import-from-file for TOC text.
4. Add editable tree preview.
5. Add project save/load.

