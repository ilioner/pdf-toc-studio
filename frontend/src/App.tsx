import { useMemo, useState } from "react";
import {
  exportPdf,
  pickOutputDirectory,
  pickPdfFile,
  previewMapping,
  revealPath,
  savePdfFile,
  splitPdf
} from "./tauriBridge";
import type { Entry, ExportResult, PreviewResult, SplitResult, SplitSegment } from "./types";

const sampleToc = `第1章 概述    1
    1.1 航空电子的基本内涵    1
    1.2 航空电子系统架构    3
    1.3 航空电子系统功能    13
第2章 机载通信系统    21
    2.1 系统组成    21
    2.2 数据链应用    33`;

const sampleRanges = `前言:1-8
第一部分:9-42
附录:43-56`;

const initialIssues = ["Run a preview to see validation feedback."];

type RangeItem = {
  id: string;
  label: string;
  startPage: string;
  endPage: string;
};

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

function formatIssues(lines: { level: string; lineNumber?: number | null; message: string }[]): string[] {
  return lines.length
    ? lines.map((issue) => `${issue.level.toUpperCase()} line ${issue.lineNumber ?? "-"}: ${issue.message}`)
    : ["No validation issues detected."];
}

function parseRangeItems(text: string): RangeItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [labelPart, rangePart] = line.includes(":") ? line.split(":", 2) : [`range-${index + 1}`, line];
      const [start, end] = rangePart.split("-", 2).map((value) => value.trim());
      return {
        id: `${index + 1}-${labelPart}-${start}-${end}`,
        label: labelPart.trim(),
        startPage: start ?? "",
        endPage: end ?? ""
      };
    });
}

function serializeRangeItems(items: RangeItem[]): string {
  return items
    .filter((item) => item.startPage.trim() && item.endPage.trim())
    .map((item) => `${item.label.trim() || "range"}:${item.startPage.trim()}-${item.endPage.trim()}`)
    .join("\n");
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
  const [splitMode, setSplitMode] = useState<"page" | "chapter" | "range">("page");
  const [splitOutputDir, setSplitOutputDir] = useState("../pdf-splits");
  const [customRangesText, setCustomRangesText] = useState(sampleRanges);
  const [rangeItems, setRangeItems] = useState<RangeItem[]>(() => parseRangeItems(sampleRanges));
  const [rangeDraftLabel, setRangeDraftLabel] = useState("");
  const [rangeDraftStart, setRangeDraftStart] = useState("");
  const [rangeDraftEnd, setRangeDraftEnd] = useState("");
  const [splitSegments, setSplitSegments] = useState<SplitSegment[]>([]);
  const [lastSplitDir, setLastSplitDir] = useState("");

  const tocLineCount = useMemo(() => countMeaningfulLines(tocText), [tocText]);
  const previewDepth = useMemo(() => summarizeDepth(previewEntries), [previewEntries]);
  const canExport = sourcePdf.trim().length > 0 && outputPdf.trim().length > 0 && tocText.trim().length > 0;
  const canSplit =
    sourcePdf.trim().length > 0 &&
    splitOutputDir.trim().length > 0 &&
    (splitMode !== "chapter" || tocText.trim().length > 0) &&
    (splitMode !== "range" || customRangesText.trim().length > 0);

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

  async function handleSplit() {
    setStatus(`Splitting PDF by ${splitMode}...`);
    const result = await splitPdf({
      sourcePdf,
      outputDir: splitOutputDir,
      splitMode,
      tocText,
      offset: Number(offset || 0),
      rangesText: customRangesText
    });
    applySplit(result);
  }

  function loadSample() {
    setOffset("8");
    setTocText(sampleToc);
    setCustomRangesText(sampleRanges);
    setRangeItems(parseRangeItems(sampleRanges));
    setRangeDraftLabel("");
    setRangeDraftStart("");
    setRangeDraftEnd("");
    setStatus("Sample TOC loaded");
  }

  async function handlePickSourcePdf() {
    const selected = await pickPdfFile();
    if (selected) {
      setSourcePdf(selected);
      setStatus("Source PDF selected");
    }
  }

  async function handlePickOutputPdf() {
    const suggestedName = outputPdf.split("/").pop() || "output.pdf";
    const selected = await savePdfFile(suggestedName);
    if (selected) {
      setOutputPdf(selected);
      setStatus("Output PDF selected");
    }
  }

  async function handlePickSplitDir() {
    const selected = await pickOutputDirectory();
    if (selected) {
      setSplitOutputDir(selected);
      setStatus("Split output directory selected");
    }
  }

  async function handleRevealPath(path: string) {
    if (!path) {
      setStatus("No path available to reveal");
      return;
    }

    const ok = await revealPath(path);
    setStatus(ok ? "Opened output location" : "Unable to open output location");
  }

  async function handleCopyPath(path: string) {
    if (!path) {
      setStatus("No path available to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(path);
      setStatus("Path copied to clipboard");
    } catch {
      setStatus("Unable to copy path");
    }
  }

  function syncRanges(nextItems: RangeItem[]) {
    setRangeItems(nextItems);
    setCustomRangesText(serializeRangeItems(nextItems));
  }

  function addRangeItem() {
    const startPage = rangeDraftStart.trim();
    const endPage = rangeDraftEnd.trim();
    if (!startPage || !endPage) {
      setStatus("Range start and end pages are required");
      return;
    }

    const nextItems = [
      ...rangeItems,
      {
        id: `${Date.now()}`,
        label: rangeDraftLabel.trim() || `range-${rangeItems.length + 1}`,
        startPage,
        endPage
      }
    ];
    syncRanges(nextItems);
    setRangeDraftLabel("");
    setRangeDraftStart("");
    setRangeDraftEnd("");
    setStatus("Custom range added");
  }

  function updateRangeItem(id: string, field: "label" | "startPage" | "endPage", value: string) {
    syncRanges(rangeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function removeRangeItem(id: string) {
    syncRanges(rangeItems.filter((item) => item.id !== id));
    setStatus("Custom range removed");
  }

  function applyPreview(result: PreviewResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Preview failed");
      return;
    }

    setPreviewEntries(result.entries);
    setPreviewRows(result.previewRows);
    setPageCount(result.pageCount);
    setIssues(formatIssues(result.issues));
    setStatus(`Preview ready${result.pageCount ? ` · ${result.pageCount} pages detected` : ""}`);
  }

  function applyExport(result: ExportResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Export failed");
      return;
    }

    setLastExportPath(result.outputPdf);
    setIssues(formatIssues(result.issues));
    setStatus(`Export complete · ${result.entryCount} entries written`);
  }

  function applySplit(result: SplitResult) {
    if (!result.ok) {
      setStatus(result.error ?? "Split failed");
      return;
    }

    setSplitSegments(result.segments);
    setLastSplitDir(result.outputDir);
    setIssues(formatIssues(result.issues));
    setStatus(`Split complete · ${result.segmentCount} files created`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="eyebrow">PDF ToC Studio</p>
          <h1>Bookmark and split PDFs with a cleaner desktop workflow.</h1>
          <p className="lead">
            Parse plain-text tables of contents, verify logical pages, export bookmark-rich PDFs, and split output by
            page, chapter, or custom ranges.
          </p>
        </div>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <h2>Session Overview</h2>
            <span className="badge">{previewEntries.length || splitSegments.length ? "Live" : "Idle"}</span>
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
              <span>Last split</span>
              <strong>{splitSegments.length || "None"}</strong>
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
            <li>Export bookmarks or split the PDF into smaller files.</li>
          </ol>
        </section>

        <section className="sidebar-panel">
          <div className="panel-heading">
            <h2>Split Modes</h2>
          </div>
          <ul className="tip-list">
            <li>`Page`: one PDF per physical page.</li>
            <li>`Chapter`: uses level-1 TOC entries as split anchors.</li>
            <li>`Custom`: accepts `1-12` or `前言:1-8` style ranges.</li>
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
              <div className="input-with-button">
                <input value={sourcePdf} onChange={(event) => setSourcePdf(event.target.value)} placeholder="/path/to/source.pdf" />
                <button type="button" className="input-action-button" onClick={handlePickSourcePdf}>
                  Browse
                </button>
              </div>
            </label>
            <label className="field">
              <span>Output PDF</span>
              <div className="input-with-button">
                <input value={outputPdf} onChange={(event) => setOutputPdf(event.target.value)} placeholder="/path/to/output.pdf" />
                <button type="button" className="input-action-button" onClick={handlePickOutputPdf}>
                  Save As
                </button>
              </div>
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

          <div className="split-panel">
            <div className="section-header compact">
              <div>
                <p className="section-kicker">Split PDF</p>
                <h2>Slice by page, chapter, or custom range</h2>
              </div>
            </div>

            <div className="segmented-control" role="tablist" aria-label="Split modes">
              {(["page", "chapter", "range"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={mode === splitMode ? "segment-button is-active" : "segment-button"}
                  onClick={() => setSplitMode(mode)}
                >
                  {mode === "page" ? "By Page" : mode === "chapter" ? "By Chapter" : "Custom Range"}
                </button>
              ))}
            </div>

            <div className="split-grid">
              <label className="field">
                <span>Split Output Directory</span>
                <div className="input-with-button">
                  <input value={splitOutputDir} onChange={(event) => setSplitOutputDir(event.target.value)} placeholder="/path/to/splits" />
                  <button type="button" className="input-action-button" onClick={handlePickSplitDir}>
                    Choose Folder
                  </button>
                </div>
              </label>

              <div className="helper-card">
                <strong>
                  {splitMode === "page" ? "Per-page split" : splitMode === "chapter" ? "Top-level chapter split" : "Range split"}
                </strong>
                <p>
                  {splitMode === "page"
                    ? "Creates one output PDF per page."
                    : splitMode === "chapter"
                      ? "Uses every level-1 TOC entry as a chapter boundary."
                      : "Supports one range per line, optionally with labels."}
                </p>
              </div>
            </div>

            {splitMode === "range" ? (
              <div className="range-builder">
                <div className="range-builder-header">
                  <div>
                    <p className="section-kicker">Custom Builder</p>
                    <h3>Compose split ranges visually</h3>
                  </div>
                  <span className="badge neutral">{rangeItems.length} ranges</span>
                </div>

                <div className="range-draft-grid">
                  <label className="field">
                    <span>Label</span>
                    <input value={rangeDraftLabel} onChange={(event) => setRangeDraftLabel(event.target.value)} placeholder="前言" />
                  </label>
                  <label className="field">
                    <span>Start Page</span>
                    <input value={rangeDraftStart} onChange={(event) => setRangeDraftStart(event.target.value)} inputMode="numeric" placeholder="1" />
                  </label>
                  <label className="field">
                    <span>End Page</span>
                    <input value={rangeDraftEnd} onChange={(event) => setRangeDraftEnd(event.target.value)} inputMode="numeric" placeholder="8" />
                  </label>
                  <div className="range-builder-action">
                    <button type="button" className="secondary-button" onClick={addRangeItem}>
                      Add Range
                    </button>
                  </div>
                </div>

                <div className="range-list">
                  {rangeItems.length ? (
                    rangeItems.map((item) => (
                      <div key={item.id} className="range-item">
                        <input
                          value={item.label}
                          onChange={(event) => updateRangeItem(item.id, "label", event.target.value)}
                          placeholder="Label"
                        />
                        <input
                          value={item.startPage}
                          onChange={(event) => updateRangeItem(item.id, "startPage", event.target.value)}
                          inputMode="numeric"
                          placeholder="Start"
                        />
                        <input
                          value={item.endPage}
                          onChange={(event) => updateRangeItem(item.id, "endPage", event.target.value)}
                          inputMode="numeric"
                          placeholder="End"
                        />
                        <button type="button" className="icon-button" onClick={() => removeRangeItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state compact-empty">No custom ranges yet. Add one above to start splitting.</div>
                  )}
                </div>

                <label className="field">
                  <span>Serialized Ranges</span>
                  <textarea
                    className="split-ranges"
                    value={customRangesText}
                    onChange={(event) => {
                      setCustomRangesText(event.target.value);
                      setRangeItems(parseRangeItems(event.target.value));
                    }}
                  />
                </label>
              </div>
            ) : null}

            <div className="action-row split-actions">
              <button className="accent-button" onClick={handleSplit} disabled={!canSplit}>
                Split PDF
              </button>
            </div>
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
                <p className="section-kicker">Split Results</p>
                <h2>Generated segments</h2>
              </div>
              <span className="badge neutral">{splitSegments.length} files</span>
            </div>
            <div className="log-block muted">
              {splitSegments.length ? (
                splitSegments.map((segment) => (
                  <div key={segment.outputPdf} className="segment-result">
                    <div>
                      {segment.label} | pages {segment.startPage}-{segment.endPage} | {segment.outputPdf}
                    </div>
                    <div className="summary-actions inline-actions">
                      <button type="button" className="tiny-button" onClick={() => handleRevealPath(segment.outputPdf)}>
                        Open Folder
                      </button>
                      <button type="button" className="tiny-button" onClick={() => handleCopyPath(segment.outputPdf)}>
                        Copy Path
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div>No split run yet.</div>
              )}
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
              <div className="summary-actions">
                <button type="button" className="tiny-button" onClick={() => handleRevealPath(lastExportPath)} disabled={!lastExportPath}>
                  Open Folder
                </button>
                <button type="button" className="tiny-button" onClick={() => handleCopyPath(lastExportPath)} disabled={!lastExportPath}>
                  Copy Path
                </button>
              </div>
            </div>
            <div className="export-summary">
              <span>Last split directory</span>
              <strong>{lastSplitDir || "No split output yet"}</strong>
              <div className="summary-actions">
                <button type="button" className="tiny-button" onClick={() => handleRevealPath(lastSplitDir)} disabled={!lastSplitDir}>
                  Open Folder
                </button>
                <button type="button" className="tiny-button" onClick={() => handleCopyPath(lastSplitDir)} disabled={!lastSplitDir}>
                  Copy Path
                </button>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
