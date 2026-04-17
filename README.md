# PDF ToC Studio

PDF ToC Studio is a desktop app and automation-ready toolkit for adding PDF bookmarks, table of contents navigation, and logical page labels from plain-text TOC input.

PDF ToC Studio 是一个面向桌面与自动化场景的 PDF 目录工具，可基于纯文本目录为 PDF 添加书签、目录导航和逻辑页码标签。

## PDF Bookmark Tool for Plain-Text TOC Workflows

If you need to add bookmarks to a PDF, create a navigable table of contents, repair logical page numbers, or convert a text TOC into PDF outline metadata, PDF ToC Studio is built for that workflow.

适用场景包括：

- add bookmarks to PDF files
- create PDF table of contents navigation
- map logical page numbers to physical PDF pages
- generate PDF outline data from plain-text TOC
- automate PDF bookmark creation with CLI or LLM skill

## Features | 功能特性

- Convert plain-text TOC into structured PDF bookmarks
- Add logical page labels for better PDF reader navigation
- Support indentation-based heading hierarchy
- Preview page mappings before export
- Validate page overflow and hierarchy issues
- Use from desktop UI, CLI, JSON bridge, or LLM skill

- 将纯文本目录转换为结构化 PDF 书签
- 添加逻辑页码标签，提升 PDF 阅读器导航体验
- 支持基于缩进的目录层级识别
- 导出前预览页码映射
- 校验页码越界与层级异常
- 可通过桌面界面、CLI、JSON bridge 或大模型 skill 使用

## Use Cases | 使用场景

- Scanned books that need PDF bookmarks
- Technical manuals with front matter offsets
- Academic or educational PDFs without navigation
- Digitized books that need logical page labels
- Batch PDF bookmark generation pipelines

## Quick Start | 快速开始

### Install dependencies | 安装依赖

```bash
git clone <your-repo-url>
cd pdf-toc-studio
pip install -r requirements.txt
npm install
cd frontend
npm install
cd ..
```

### Launch the desktop app | 启动桌面应用

Tk desktop prototype:

```bash
python3 launch.py
```

Tauri desktop shell:

```bash
npm run tauri:dev
```

### Preview a TOC mapping | 预览目录映射

```bash
python3 -m core.cli \
  --pdf ./examples/source.pdf \
  --toc ./examples/toc.txt \
  --out ./examples/output.pdf \
  --offset 8 \
  --preview
```

### Export a bookmarked PDF | 导出带书签的 PDF

```bash
python3 -m core.cli \
  --pdf ./examples/source.pdf \
  --toc ./examples/toc.txt \
  --out ./examples/output.pdf \
  --offset 8
```

## How It Works | 工作原理

1. Import or paste a plain-text table of contents.
2. Set the logical-to-physical page offset.
3. Preview the parsed hierarchy and page mapping.
4. Validate warnings and errors.
5. Export a new PDF with bookmarks and logical page labels.

## Example TOC Format | 目录格式示例

```text
Chapter 1 Introduction    1
    1.1 Background    3
    1.2 Scope    9
Chapter 2 Methods    17
```

Rule:

- every line ends with a logical page number
- every 4 leading spaces create one child level
- physical page = logical page + offset

## LLM Skill Usage | 大模型 Skill 用法

This repository includes a reusable skill package in `skills/pdf-toc-studio/` and a stable script entry for model-driven workflows.

兼容方式分为两类：

- skill-aware platforms:
  直接调用 `pdf-toc-studio` 或使用平台自己的 skill 语法
- general chat or agent platforms:
  直接运行 `skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py`

Typical prompts:

- Codex / OpenAI-style: `Use $pdf-toc-studio to preview a TOC mapping for ./examples/source.pdf using this TOC text and offset 8.`
- Claude / Gemini-style: `Use the pdf-toc-studio workflow in this repository, run the script in preview mode for ./examples/source.pdf with offset 8, and summarize the JSON result.`
- 通用 Agent 风格：`运行 skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py，将 ./examples/source.pdf 与 ./examples/toc.txt 做预览或导出，并返回 JSON 结果摘要。`

Stable script example:

```bash
python3 skills/pdf-toc-studio/scripts/run_pdf_toc_studio.py \
  preview \
  --pdf ./examples/source.pdf \
  --toc-file ./examples/toc.txt \
  --offset 8
```

## Repository Structure | 仓库结构

- `core/toc_engine.py`: TOC parsing, validation, bookmark export, page-label generation
- `core/cli.py`: command-line interface for preview and export
- `core/bridge.py`: JSON interface for desktop shells and automation
- `app/main.py`: Tk desktop app
- `frontend/`: Tauri + React frontend
- `skills/pdf-toc-studio/`: packaged LLM skill definition and script wrapper

## FAQ

### Can this add bookmarks to an existing PDF?

Yes. The tool reads an existing PDF and writes a new PDF with bookmark and page-label metadata.

### Does it support logical page numbers?

Yes. It supports page offsets so you can align printed page numbers with actual PDF pages.

### Is it suitable for LLM or agent automation?

Yes. The project includes a CLI, JSON bridge, and a reusable skill package for model-driven workflows.

## Keywords

PDF bookmark tool, PDF table of contents generator, PDF outline editor, logical page labels, TOC to PDF bookmarks, plain-text TOC parser, desktop PDF bookmark app, PDF bookmark automation
