import type { ExportResult, PreviewResult } from "./types";

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
