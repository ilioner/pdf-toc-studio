import type { ExportResult, PreviewResult, SplitResult } from "./types";

declare global {
  interface Window {
    __PDF_TOC_STUDIO_MOCK__?: boolean;
  }
}

async function callBackend<T>(payload: Record<string, unknown>): Promise<T> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>("run_python_bridge", { payloadJson: JSON.stringify(payload) });
  } catch {
    return mockCall<T>(payload);
  }
}

async function invokeCommand<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

function mockCall<T>(payload: Record<string, unknown>): Promise<T> {
  const offset = Number(payload.offset ?? 0);
  const tocText = String(payload.tocText ?? "");
  const lines = tocText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const previewRows = lines.slice(0, 20).map((line, index) => {
    const match = line.match(/^(.*?)\s+(\d+)\s*$/);
    if (!match) {
      return `Invalid line ${index + 1}: ${line}`;
    }
    const logical = Number(match[2]);
    return `${match[1]} | logical ${logical} -> physical ${logical + offset}`;
  });

  if (payload.action === "preview") {
    return Promise.resolve({
      ok: true,
      entries: [],
      previewRows,
      issues: [],
      pageCount: null
    } as T);
  }

  if (payload.action === "split") {
    const outputDir = String(payload.outputDir ?? "");
    const splitMode = String(payload.splitMode ?? "page");

    const segments =
      splitMode === "page"
        ? lines.slice(0, 3).map((_, index) => ({
            label: `page-${index + 1}`,
            startPage: index + 1,
            endPage: index + 1,
            outputPdf: `${outputDir}/page-${index + 1}.pdf`
          }))
        : splitMode === "chapter"
          ? lines
              .filter((line) => !line.startsWith("    "))
              .slice(0, 3)
              .map((line, index) => ({
                label: line.replace(/\s+\d+\s*$/, ""),
                startPage: index * 10 + 1,
                endPage: index * 10 + 10,
                outputPdf: `${outputDir}/chapter-${index + 1}.pdf`
              }))
          : String(payload.rangesText ?? "")
              .split(/\n|,/)
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 3)
              .map((line, index) => {
                const [start, end] = line.replace(/^.*?:/, "").split("-").map((value) => Number(value.trim()));
                return {
                  label: line.includes(":") ? line.split(":")[0].trim() : `range-${index + 1}`,
                  startPage: start,
                  endPage: end,
                  outputPdf: `${outputDir}/range-${index + 1}.pdf`
                };
              });

    return Promise.resolve({
      ok: true,
      outputDir,
      segmentCount: segments.length,
      segments,
      issues: []
    } as T);
  }

  return Promise.resolve({
    ok: true,
    outputPdf: String(payload.outputPdf ?? ""),
    entryCount: lines.length,
    issues: []
  } as T);
}

export function previewMapping(payload: {
  sourcePdf: string;
  tocText: string;
  offset: number;
}): Promise<PreviewResult> {
  return callBackend<PreviewResult>({
    action: "preview",
    ...payload
  });
}

export function exportPdf(payload: {
  sourcePdf: string;
  outputPdf: string;
  tocText: string;
  offset: number;
}): Promise<ExportResult> {
  return callBackend<ExportResult>({
    action: "export",
    ...payload
  });
}

export function splitPdf(payload: {
  sourcePdf: string;
  outputDir: string;
  splitMode: "page" | "chapter" | "range";
  tocText: string;
  offset: number;
  rangesText: string;
}): Promise<SplitResult> {
  return callBackend<SplitResult>({
    action: "split",
    ...payload
  });
}

export async function pickPdfFile(): Promise<string | null> {
  try {
    return await invokeCommand<string | null>("pick_file", {
      fileTypeName: "PDF files",
      extensions: ["pdf"]
    });
  } catch {
    return null;
  }
}

export async function pickOutputDirectory(): Promise<string | null> {
  try {
    return await invokeCommand<string | null>("pick_folder");
  } catch {
    return null;
  }
}

export async function savePdfFile(defaultFileName: string): Promise<string | null> {
  try {
    return await invokeCommand<string | null>("save_file", {
      defaultFileName
    });
  } catch {
    return null;
  }
}

export async function revealPath(path: string): Promise<boolean> {
  try {
    await invokeCommand("reveal_path", { path });
    return true;
  } catch {
    return false;
  }
}
