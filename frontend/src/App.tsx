import { useMemo, useState } from "react";
import { exportPdf, previewMapping } from "./tauriBridge";
import type { Entry, ExportResult, PreviewResult } from "./types";

const sampleToc = `第1章 概述    1
    1.1 航空电子的基本内涵    1
    1.2 航空电子系统架构    3
    1.3 航空电子系统功能    13
第2章 机载通信系统    21
    2.1 系统组成    21
    2.2 数据链应用    33`;

const initialIssues = ["Run a preview to see validation feedback."];

function countMeaningfulLines(text: string): number {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function summarizeDepth(entries: Entry[]): string {
  if (!entries.length) {
    return "No hierarchy parsed";
  }

  const maxLevel = Math.max(...entries.map((entry) => entry.level));
  return `${maxLevel} level${maxLevel > 1 ? "s" : ""}`;
}

export function App() {
  const [sourcePdf, setSourcePdf] = useState("../航空电子技术（正文）.pdf");
  const [outputPdf, setOutputPdf] = useState("../pdf-toc-studio-output-tauri.pdf");
  const [offset, setOffset] = useState("8");
  const [tocText, setTocText] = useState(sampleToc);
  const [previewEntries, setPreviewEntries] = useState<Entry[]>([]);
  const [previewRows, setPreviewRows] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>(initialIssues);
  const [status, setStatus] = useState("Ready for preview");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [lastExportPath, setLastExportPath] = useState("");

  const tocLineCount = useMemo(() => countMeaningfulLines(tocText), [tocText]);
  const previewDepth = useMemo(() => summarizeDepth(previewEntries), [previewEntries]);
  const canExport = sourcePdf.trim().length > 0 && outputPdf.trim().length > 0 && tocText.trim().length > 0;

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

  function loadSample() {
    setOffset("8");
    setTocText(sampleToc);
    setStatus("Sample TOC loaded");
  }

  function applyPreview(result: PreviewResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Preview failed");
      return;
    }

    setPreviewEntries(result.entries);
    setPreviewRows(result.previewRows);
    setPageCount(result.pageCount);
    setIssues(
      result.issues.length
        ? result.issues.map((issue) => `${issue.level.toUpperCase()} line ${issue.lineNumber ?? "-"}: ${issue.message}`)
        : ["No validation issues detected."]
    );
    setStatus(`Preview ready${result.pageCount ? ` · ${result.pageCount} pages detected` : ""}`);
  }

  function applyExport(result: ExportResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Export failed");
      return;
    }

    setLastExportPath(result.outputPdf);
    setIssues(
      result.issues.length
        ? result.issues.map((issue) => `${issue.level.toUpperCase()} line ${issue.lineNumber ?? "-"}: ${issue.message}`)
        : ["No validation issues detected."]
    );
    setStatus(`Export complete · ${result.entryCount} entries written`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="eyebrow">PDF ToC Studio</p>
          <h1>Bookmark PDFs with a cleaner desktop workflow.</h1>
          <p className="lead">
            Parse plain-text tables of contents, verify logical pages, and export bookmark-rich PDFs without touching
            the Python core.
          </p>
        </div>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <h2>Session Overview</h2>
            <span className="badge">{previewEntries.length ? "Live" : "Idle"}</span>
          </div>
          <div className="stat-grid">
            <article className="stat-card">
              <span>TOC lines</span>
              <strong>{tocLineCount}</strong>
            </article>
            <article className="stat-card">
              <span>Hierarchy</span>
              <strong>{previewDepth}</strong>
            </article>
            <article className="stat-card">
              <span>PDF pages</span>
              <strong>{pageCount ?? "Unknown"}</strong>
            </article>
            <article className="stat-card">
              <span>Offset</span>
              <strong>{offset || "0"}</strong>
            </article>
          </div>
        </section>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <h2>Workflow</h2>
          </div>
          <ol className="workflow-list">
            <li>Set the source PDF and output target.</li>
            <li>Paste or refine the plain-text TOC.</li>
            <li>Preview logical to physical mapping.</li>
            <li>Export bookmarks and page labels.</li>
          </ol>
        </section>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <h2>Smart Tips</h2>
          </div>
          <ul className="tip-list">
            <li>Indent child headings with four spaces per level.</li>
            <li>If logical page 1 starts on PDF page 9, use offset 8.</li>
            <li>Warnings can be exported, but errors must be fixed first.</li>
          </ul>
          <button className="ghost-button" onClick={loadSample}>
            Load Sample TOC
          </button>
        </section>
      </aside>

      <main className="workspace">
        <section className="window-panel">
          <div className="window-toolbar">
            <div className="traffic-lights" aria-hidden="true">
              <span className="dot dot-close" />
              <span className="dot dot-minimize" />
              <span className="dot dot-expand" />
            </div>
            <div className="toolbar-title">
              <strong>Document Setup</strong>
              <span>{status}</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Source PDF</span>
              <input value={sourcePdf} onChange={(event) => setSourcePdf(event.target.value)} placeholder="/path/to/source.pdf" />
            </label>
            <label className="field">
              <span>Output PDF</span>
              <input value={outputPdf} onChange={(event) => setOutputPdf(event.target.value)} placeholder="/path/to/output.pdf" />
            </label>
            <label className="field field-compact">
              <span>Page Offset</span>
              <input value={offset} onChange={(event) => setOffset(event.target.value)} inputMode="numeric" />
            </label>
            <div className="helper-card">
              <strong>Offset rule</strong>
              <p>Physical page = logical page + offset.</p>
            </div>
          </div>

          <label className="field">
            <span>TOC Text</span>
            <textarea value={tocText} onChange={(event) => setTocText(event.target.value)} />
          </label>

          <div className="action-row">
            <button onClick={handlePreview}>Preview Mapping</button>
            <button className="secondary-button" onClick={handleExport} disabled={!canExport}>
              Export PDF
            </button>
          </div>
        </section>

        <section className="results-grid">
          <section className="window-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Preview</p>
                <h2>Parsed entries</h2>
              </div>
              <span className="badge">{previewEntries.length} rows</span>
            </div>

            <div className="table-wrap">
              {previewEntries.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Title</th>
                      <th>Logical</th>
                      <th>Physical</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.map((entry) => (
                      <tr key={`${entry.lineNumber}-${entry.title}`}>
                        <td>L{entry.level}</td>
                        <td>{entry.title}</td>
                        <td>{entry.logicalPage}</td>
                        <td>{entry.physicalPage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">No preview yet. Run a preview to inspect the parsed hierarchy.</div>
              )}
            </div>
          </section>

          <section className="window-panel stacked-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Validation</p>
                <h2>Checks and export status</h2>
              </div>
              <span className="badge neutral">{issues.length} items</span>
            </div>

            <div className="log-block">
              {issues.map((issue) => (
                <div key={issue}>{issue}</div>
              ))}
            </div>

            <div className="section-header compact">
              <div>
                <p className="section-kicker">Console Preview</p>
                <h2>Bridge output snapshot</h2>
              </div>
            </div>
            <div className="log-block muted">
              {previewRows.length ? previewRows.map((row) => <div key={row}>{row}</div>) : <div>No bridge preview yet.</div>}
            </div>

            <div className="export-summary">
              <span>Last export</span>
              <strong>{lastExportPath || "Nothing exported in this session"}</strong>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
