from __future__ import annotations

import sys
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core import export_pdf_with_toc, format_preview_rows, parse_toc_text, validate_entries


class PdfTocStudioApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("PDF ToC Studio")
        self.root.geometry("1080x760")
        self.root.minsize(920, 680)

        self.source_pdf_var = tk.StringVar()
        self.output_pdf_var = tk.StringVar()
        self.offset_var = tk.StringVar(value="8")
        self.status_var = tk.StringVar(value="Ready")

        self._build_ui()
        self._load_sample_if_available()

    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(1, weight=1)

        header = ttk.Frame(self.root, padding=16)
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)

        ttk.Label(header, text="PDF ToC Studio", font=("Helvetica", 20, "bold")).grid(
            row=0, column=0, sticky="w"
        )
        ttk.Label(
            header,
            text="Import a PDF, paste a plain-text TOC, set the logical-to-physical page offset, and export a new PDF.",
        ).grid(row=1, column=0, sticky="w", pady=(6, 0))

        body = ttk.Panedwindow(self.root, orient=tk.HORIZONTAL)
        body.grid(row=1, column=0, sticky="nsew", padx=16, pady=(0, 16))

        left = ttk.Frame(body, padding=12)
        right = ttk.Frame(body, padding=12)
        body.add(left, weight=3)
        body.add(right, weight=2)

        self._build_inputs(left)
        self._build_preview(right)

        footer = ttk.Frame(self.root, padding=(16, 0, 16, 16))
        footer.grid(row=2, column=0, sticky="ew")
        footer.columnconfigure(0, weight=1)
        ttk.Label(footer, textvariable=self.status_var).grid(row=0, column=0, sticky="w")

    def _build_inputs(self, parent: ttk.Frame) -> None:
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(4, weight=1)

        ttk.Label(parent, text="Source PDF").grid(row=0, column=0, sticky="w", pady=(0, 8))
        ttk.Entry(parent, textvariable=self.source_pdf_var).grid(row=0, column=1, sticky="ew", padx=(12, 8))
        ttk.Button(parent, text="Browse", command=self._choose_source_pdf).grid(row=0, column=2, sticky="ew")

        ttk.Label(parent, text="Output PDF").grid(row=1, column=0, sticky="w", pady=(0, 8))
        ttk.Entry(parent, textvariable=self.output_pdf_var).grid(row=1, column=1, sticky="ew", padx=(12, 8))
        ttk.Button(parent, text="Browse", command=self._choose_output_pdf).grid(row=1, column=2, sticky="ew")

        ttk.Label(parent, text="Page Offset").grid(row=2, column=0, sticky="w", pady=(0, 8))
        ttk.Entry(parent, textvariable=self.offset_var, width=12).grid(row=2, column=1, sticky="w", padx=(12, 8))
        ttk.Label(
            parent,
            text="Example: if logical page 1 starts on PDF page 9, use offset 8.",
        ).grid(row=2, column=2, sticky="w")

        actions = ttk.Frame(parent)
        actions.grid(row=3, column=0, columnspan=3, sticky="ew", pady=(4, 12))
        ttk.Button(actions, text="Preview Mapping", command=self.preview_mapping).pack(side=tk.LEFT)
        ttk.Button(actions, text="Export PDF", command=self.export_pdf).pack(side=tk.LEFT, padx=(8, 0))

        ttk.Label(parent, text="TOC Text").grid(row=4, column=0, columnspan=3, sticky="w", pady=(0, 8))
        self.toc_text = tk.Text(parent, wrap="none", font=("Menlo", 12))
        self.toc_text.grid(row=5, column=0, columnspan=3, sticky="nsew")

        y_scroll = ttk.Scrollbar(parent, orient="vertical", command=self.toc_text.yview)
        y_scroll.grid(row=5, column=3, sticky="ns")
        self.toc_text.configure(yscrollcommand=y_scroll.set)

    def _build_preview(self, parent: ttk.Frame) -> None:
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(1, weight=1)
        parent.rowconfigure(3, weight=1)

        ttk.Label(parent, text="Preview").grid(row=0, column=0, sticky="w")
        self.preview_box = tk.Text(parent, wrap="word", height=16, state="disabled", font=("Menlo", 11))
        self.preview_box.grid(row=1, column=0, sticky="nsew", pady=(8, 16))

        ttk.Label(parent, text="Validation").grid(row=2, column=0, sticky="w")
        self.validation_box = tk.Text(parent, wrap="word", height=12, state="disabled", font=("Menlo", 11))
        self.validation_box.grid(row=3, column=0, sticky="nsew", pady=(8, 0))

    def _load_sample_if_available(self) -> None:
        workspace_root = PROJECT_ROOT.parent
        sample_pdf = workspace_root / "航空电子技术（正文）.pdf"
        sample_toc = workspace_root / "toc.txt"
        sample_output = workspace_root / "pdf-toc-studio-output.pdf"

        if sample_pdf.exists():
            self.source_pdf_var.set(str(sample_pdf))
        if sample_toc.exists():
            self.toc_text.insert("1.0", sample_toc.read_text(encoding="utf-8"))
        self.output_pdf_var.set(str(sample_output))

    def _choose_source_pdf(self) -> None:
        path = filedialog.askopenfilename(filetypes=[("PDF files", "*.pdf")])
        if path:
            self.source_pdf_var.set(path)

    def _choose_output_pdf(self) -> None:
        path = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF files", "*.pdf")])
        if path:
            self.output_pdf_var.set(path)

    def _get_offset(self) -> int:
        try:
            return int(self.offset_var.get().strip())
        except ValueError as exc:
            raise ValueError("Page offset must be an integer") from exc

    def _set_text(self, widget: tk.Text, lines: list[str]) -> None:
        widget.configure(state="normal")
        widget.delete("1.0", tk.END)
        widget.insert("1.0", "\n".join(lines))
        widget.configure(state="disabled")

    def preview_mapping(self) -> None:
        try:
            toc_text = self.toc_text.get("1.0", tk.END)
            entries = parse_toc_text(toc_text, self._get_offset())

            pdf_page_count = None
            source_pdf = Path(self.source_pdf_var.get().strip())
            if source_pdf.exists():
                import fitz

                with fitz.open(source_pdf) as doc:
                    pdf_page_count = doc.page_count

            issues = validate_entries(entries, pdf_page_count=pdf_page_count)
            preview_rows = format_preview_rows(entries, limit=25)
            validation_rows = (
                [f"{issue.level.upper()} line {issue.line_number}: {issue.message}" for issue in issues]
                if issues
                else ["No validation issues detected."]
            )

            self._set_text(self.preview_box, preview_rows)
            self._set_text(self.validation_box, validation_rows)
            self.status_var.set(f"Parsed {len(entries)} TOC entries")
        except Exception as exc:
            self.status_var.set("Preview failed")
            messagebox.showerror("Preview failed", str(exc))

    def export_pdf(self) -> None:
        try:
            source_pdf = self.source_pdf_var.get().strip()
            output_pdf = self.output_pdf_var.get().strip()
            toc_text = self.toc_text.get("1.0", tk.END)
            offset = self._get_offset()

            if not source_pdf:
                raise ValueError("Source PDF is required")
            if not output_pdf:
                raise ValueError("Output PDF is required")

            entries, issues = export_pdf_with_toc(source_pdf, output_pdf, toc_text, offset)
            self.preview_mapping()
            issue_count = len(issues)
            self.status_var.set(f"Exported {len(entries)} entries to {output_pdf}")
            messagebox.showinfo(
                "Export complete",
                f"Exported PDF successfully.\n\nEntries: {len(entries)}\nValidation issues: {issue_count}",
            )
        except Exception as exc:
            self.status_var.set("Export failed")
            messagebox.showerror("Export failed", str(exc))


def main() -> None:
    root = tk.Tk()
    ttk.Style().theme_use("clam")
    PdfTocStudioApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
