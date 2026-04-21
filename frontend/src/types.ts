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

export type SplitSegment = {
  label: string;
  startPage: number;
  endPage: number;
  outputPdf: string;
};

export type SplitResult = {
  ok: boolean;
  outputDir: string;
  segmentCount: number;
  segments: SplitSegment[];
  issues: Issue[];
  error?: string;
};

export type ExtractedImage = {
  pageNumber: number;
  imageIndex: number;
  title?: string | null;
  width: number;
  height: number;
  extension: string;
  outputPath: string;
};

export type ExtractImagesResult = {
  ok: boolean;
  outputDir: string;
  imageCount: number;
  images: ExtractedImage[];
  error?: string;
};
