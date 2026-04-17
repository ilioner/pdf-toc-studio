export type Issue = {
  level: string;
  message: string;
  lineNumber?: number | null;
};

export type Entry = {
  level: number;
  title: string;
  logicalPage: number;
  physicalPage: number;
  lineNumber: number;
};

export type PreviewResult = {
  ok: boolean;
  entries: Entry[];
  previewRows: string[];
  issues: Issue[];
  pageCount: number | null;
  error?: string;
};

export type ExportResult = {
  ok: boolean;
  outputPdf: string;
  entryCount: number;
  issues: Issue[];
  error?: string;
};
