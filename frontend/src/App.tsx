import { useState } from "react";
import { exportPdf, previewMapping } from "./tauriBridge";
import type { ExportResult, PreviewResult } from "./types";

const sampleToc = `第1章 概述    1
    1.1 航空电子的基本内涵    1
    1.2 航空电子系统架构    3
    1.3 航空电子系统功能    13`;

export function App() {
  const [sourcePdf, setSourcePdf] = useState("../航空电子技术（正文）.pdf");
  const [outputPdf, setOutputPdf] = useState("../pdf-toc-studio-output-tauri.pdf");
  const [offset, setOffset] = useState("8");
  const [tocText, setTocText] = useState(sampleToc);
  const [previewRows, setPreviewRows] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>(["No validation run yet."]);
  const [status, setStatus] = useState("Tauri-compatible UI scaffold ready");

  async function handlePreview() {
    setStatus("Generating preview...");
    const result = await previewMapping({
      sourcePdf,
      tocText,
      offset: Number(offset || 0)
    });
    applyPreview(result);
  }

  async function handleExport() {
    setStatus("Exporting PDF...");
    const result = await exportPdf({
      sourcePdf,
      outputPdf,
      tocText,
      offset: Number(offset || 0)
    });
    applyExport(result);
  }

  function applyPreview(result: PreviewResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Preview failed");
      return;
    }

    setPreviewRows(result.previewRows);
    setIssues(
      result.issues.length
        ? result.issues.map((issue) => `${issue.level.toUpperCase()} line ${issue.lineNumber ?? "-"}: ${issue.message}`)
        : ["No validation issues detected."]
    );
    setStatus(`Preview ready${result.pageCount ? ` · PDF pages: ${result.pageCount}` : ""}`);
  }

  function applyExport(result: ExportResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Export failed");
      return;
    }

    setIssues(
      result.issues.length
        ? result.issues.map((issue) => `${issue.level.toUpperCase()} line ${issue.lineNumber ?? "-"}: ${issue.message}`)
        : ["No validation issues detected."]
    );
    setStatus(`Export complete · ${result.entryCount} entries · ${result.outputPdf}`);
  }

  return (
    <div className="shell">
      <header className="hero">
        <p className="eyebrow">PDF ToC Studio</p>
        <h1>Plain-text TOC to production-ready PDF bookmarks</h1>
        <p className="subcopy">
          Keep the Python core, add a Tauri shell, and preserve logical page labels while bookmarks jump to the right
          physical pages.
        </p>
      </header>

      <main className="grid">
        <section className="panel">
          <h2>Input</h2>
          <label>
            <span>Source PDF</span>
            <input value={sourcePdf} onChange={(event) => setSourcePdf(event.target.value)} />
          </label>
          <label>
            <span>Output PDF</span>
            <input value={outputPdf} onChange={(event) => setOutputPdf(event.target.value)} />
          </label>
          <label>
            <span>Page Offset</span>
            <input value={offset} onChange={(event) => setOffset(event.target.value)} />
          </label>
          <label className="toc-field">
            <span>TOC Text</span>
            <textarea value={tocText} onChange={(event) => setTocText(event.target.value)} />
          </label>
          <div className="actions">
            <button onClick={handlePreview}>Preview Mapping</button>
            <button className="secondary" onClick={handleExport}>
              Export PDF
            </button>
          </div>
        </section>

        <section className="panel panel-accent">
          <h2>Preview</h2>
          <div className="mono-block">
            {previewRows.length ? previewRows.map((row) => <div key={row}>{row}</div>) : <div>No preview yet.</div>}
          </div>
        </section>

        <section className="panel">
          <h2>Validation</h2>
          <div className="mono-block">
            {issues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        </section>
      </main>

      <footer className="status">{status}</footer>
    </div>
  );
}
