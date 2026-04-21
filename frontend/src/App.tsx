import { useMemo, useState } from "react";
import {
  extractPdfImages,
  exportPdf,
  pickOutputDirectory,
  pickPdfFile,
  previewMapping,
  revealPath,
  savePdfFile,
  splitPdf
} from "./tauriBridge";
import type { Entry, ExportResult, ExtractImagesResult, ExtractedImage, PreviewResult, SplitResult, SplitSegment } from "./types";

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

type Language = "zh" | "en";

type RangeItem = {
  id: string;
  label: string;
  startPage: string;
  endPage: string;
};

type ChapterCandidate = {
  level: number;
  title: string;
  logicalPage: number;
  physicalPage: number;
};

type IssueLine = {
  level: string;
  lineNumber?: number | null;
  message: string;
};

type StatusState =
  | { kind: "previewStatus" }
  | { kind: "previewGenerating" }
  | { kind: "previewReady"; pageCount: number | null }
  | { kind: "exporting" }
  | { kind: "exportComplete"; entryCount: number }
  | { kind: "splitting"; mode: string }
  | { kind: "splitComplete"; count: number }
  | { kind: "sampleLoaded" }
  | { kind: "sourceSelected" }
  | { kind: "outputSelected" }
  | { kind: "folderSelected" }
  | { kind: "noPathReveal" }
  | { kind: "openedOutput" }
  | { kind: "unableOpen" }
  | { kind: "noPathCopy" }
  | { kind: "copied" }
  | { kind: "unableCopy" }
  | { kind: "rangeRequired" }
  | { kind: "rangeAdded" }
  | { kind: "rangeRemoved" }
  | { kind: "custom"; text: string };

type Copy = {
  appName: string;
  heroTitle: string;
  heroBody: string;
  sessionOverview: string;
  workflow: string;
  splitModes: string;
  statusLive: string;
  statusIdle: string;
  tocLines: string;
  hierarchy: string;
  pdfPages: string;
  lastSplit: string;
  unknown: string;
  none: string;
  workflowSteps: string[];
  splitModeTips: string[];
  loadSample: string;
  workbench: string;
  documentSetup: string;
  inputHint: string;
  sourcePdf: string;
  outputPdf: string;
  browse: string;
  saveAs: string;
  pageOffset: string;
  offsetRuleTitle: string;
  offsetRuleBody: string;
  tocText: string;
  previewMapping: string;
  exportPdf: string;
  splitPdf: string;
  extractImages: string;
  splitSection: string;
  splitTitle: string;
  extractSection: string;
  extractTitle: string;
  extractFilterTitle: string;
  titledImagesOnly: string;
  titledImagesHint: string;
  byPage: string;
  byChapter: string;
  customRange: string;
  splitOutputDirectory: string;
  imageOutputDirectory: string;
  minImageWidth: string;
  minImageHeight: string;
  minImageBytesKb: string;
  chooseFolder: string;
  splitHelpTitle: Record<"page" | "chapter" | "range", string>;
  splitHelpBody: Record<"page" | "chapter" | "range", string>;
  splitLevel: string;
  splitLevelHint: string;
  estimatedFiles: string;
  exampleEntries: string;
  noChapterMatches: string;
  includeSupplementary: string;
  excludeSupplementaryHint: string;
  levelOption: (level: number) => string;
  chapterCandidateCount: (count: number) => string;
  customBuilder: string;
  composeRanges: string;
  rangesCount: (count: number) => string;
  label: string;
  startPage: string;
  endPage: string;
  addRange: string;
  remove: string;
  noRanges: string;
  serializedRanges: string;
  results: string;
  parsedEntries: string;
  rowsCount: (count: number) => string;
  level: string;
  title: string;
  logical: string;
  physical: string;
  noPreview: string;
  validation: string;
  checksAndExport: string;
  itemsCount: (count: number) => string;
  splitResults: string;
  generatedSegments: string;
  filesCount: (count: number) => string;
  openFolder: string;
  copyPath: string;
  noSplit: string;
  noImages: string;
  imageResults: string;
  imageCount: (count: number) => string;
  untitledImage: string;
  consolePreview: string;
  bridgeSnapshot: string;
  noBridge: string;
  lastExport: string;
  nothingExported: string;
  lastSplitDirectory: string;
  noSplitOutput: string;
  lastImageDirectory: string;
  noImageOutput: string;
  extractFilterHint: string;
  previewStatus: string;
  previewGenerating: string;
  previewReady: (pageCount: number | null) => string;
  exporting: string;
  exportComplete: (entryCount: number) => string;
  splitting: (mode: string) => string;
  splitComplete: (count: number) => string;
  extractingImages: string;
  extractComplete: (count: number) => string;
  sampleLoaded: string;
  sourceSelected: string;
  outputSelected: string;
  folderSelected: string;
  noPathReveal: string;
  openedOutput: string;
  unableOpen: string;
  noPathCopy: string;
  copied: string;
  unableCopy: string;
  rangeRequired: string;
  rangeAdded: string;
  rangeRemoved: string;
  noHierarchy: string;
  levels: (count: number) => string;
  validationIssue: (level: string, lineNumber: number | null | undefined, message: string) => string;
  noValidationIssues: string;
  placeholderSource: string;
  placeholderOutput: string;
  placeholderSplit: string;
  placeholderLabel: string;
  placeholderStart: string;
  placeholderEnd: string;
  langLabel: string;
  zh: string;
  en: string;
};

const copy: Record<Language, Copy> = {
  zh: {
    appName: "PDF ToC Studio",
    heroTitle: "像原生桌面应用一样，整理目录、校验页码并拆分 PDF。",
    heroBody: "从纯文本目录解析层级，预览逻辑页到物理页映射，导出带书签的 PDF，或按页面、章节与自定义区间拆分输出。",
    sessionOverview: "会话概览",
    workflow: "工作流",
    splitModes: "拆分模式",
    statusLive: "处理中",
    statusIdle: "待开始",
    tocLines: "目录行数",
    hierarchy: "层级深度",
    pdfPages: "PDF 页数",
    lastSplit: "最近拆分",
    unknown: "未知",
    none: "无",
    workflowSteps: [
      "选择源 PDF 和导出目标。",
      "粘贴或整理纯文本目录。",
      "预览逻辑页和物理页映射。",
      "导出书签 PDF，或拆分成更小文件。"
    ],
    splitModeTips: [
      "按页：每个物理页生成一个 PDF。",
      "按章节：以一级目录为拆分锚点。",
      "自定义：支持 `1-12` 或 `前言:1-8` 格式。"
    ],
    loadSample: "载入示例目录",
    workbench: "工作台",
    documentSetup: "文档设置",
    inputHint: "输入路径、目录和拆分策略后即可执行。",
    sourcePdf: "源 PDF",
    outputPdf: "输出 PDF",
    browse: "浏览",
    saveAs: "另存为",
    pageOffset: "页码偏移",
    offsetRuleTitle: "偏移规则",
    offsetRuleBody: "物理页 = 逻辑页 + 偏移量",
    tocText: "目录文本",
    previewMapping: "预览映射",
    exportPdf: "导出 PDF",
    splitPdf: "拆分 PDF",
    extractImages: "提取图片",
    splitSection: "拆分 PDF",
    splitTitle: "按页面、章节或自定义区间切分",
    extractSection: "提取图片",
    extractTitle: "导出 PDF 内嵌图片资源",
    extractFilterTitle: "提取筛选",
    titledImagesOnly: "仅提取带标题的图片",
    titledImagesHint: "优先使用图片对象名称，其次识别页面附近的图题并用于命名。",
    byPage: "按页",
    byChapter: "按章节",
    customRange: "自定义区间",
    splitOutputDirectory: "拆分输出目录",
    imageOutputDirectory: "图片输出目录",
    minImageWidth: "最小宽度",
    minImageHeight: "最小高度",
    minImageBytesKb: "最小体积(KB)",
    chooseFolder: "选择文件夹",
    splitHelpTitle: {
      page: "逐页拆分",
      chapter: "一级章节拆分",
      range: "区间拆分"
    },
    splitHelpBody: {
      page: "为每一个物理页生成独立 PDF。",
      chapter: "可按所选目录层级生成章节文件，并实时预览示例。",
      range: "每行一个区间，可选附带区间标签。"
    },
    splitLevel: "拆分层级",
    splitLevelHint: "按所选目录层级作为拆分起点。",
    estimatedFiles: "预计文件数",
    exampleEntries: "示例条目",
    noChapterMatches: "当前层级下没有可拆分的章节条目。",
    includeSupplementary: "包含思考题 / 参考文献",
    excludeSupplementaryHint: "关闭后会跳过教材中常见的补充条目。",
    levelOption: (level) => `L${level}`,
    chapterCandidateCount: (count) => `${count} 个候选章节`,
    customBuilder: "自定义构建器",
    composeRanges: "用可视方式编辑拆分区间",
    rangesCount: (count) => `${count} 个区间`,
    label: "标签",
    startPage: "起始页",
    endPage: "结束页",
    addRange: "添加区间",
    remove: "删除",
    noRanges: "还没有自定义区间，请先在上方添加。",
    serializedRanges: "序列化区间",
    results: "结果",
    parsedEntries: "解析结果",
    rowsCount: (count) => `${count} 行`,
    level: "层级",
    title: "标题",
    logical: "逻辑页",
    physical: "物理页",
    noPreview: "还没有预览结果，先执行一次预览来检查解析层级。",
    validation: "校验",
    checksAndExport: "检查项与导出状态",
    itemsCount: (count) => `${count} 项`,
    splitResults: "拆分结果",
    generatedSegments: "生成的分段文件",
    filesCount: (count) => `${count} 个文件`,
    openFolder: "打开文件夹",
    copyPath: "复制路径",
    noSplit: "还没有执行拆分。",
    noImages: "还没有提取任何图片。",
    imageResults: "图片结果",
    imageCount: (count) => `${count} 张图片`,
    untitledImage: "未命名图片",
    consolePreview: "控制台预览",
    bridgeSnapshot: "桥接层输出快照",
    noBridge: "还没有桥接预览输出。",
    lastExport: "最近导出",
    nothingExported: "本次会话尚未导出",
    lastSplitDirectory: "最近拆分目录",
    noSplitOutput: "还没有拆分输出",
    lastImageDirectory: "最近图片目录",
    noImageOutput: "还没有图片输出",
    extractFilterHint: "用最小宽高和体积过滤小图标、角标和装饰图片。",
    previewStatus: "准备预览",
    previewGenerating: "正在生成预览…",
    previewReady: (pageCount) => `预览已就绪${pageCount ? ` · 检测到 ${pageCount} 页` : ""}`,
    exporting: "正在导出 PDF…",
    exportComplete: (entryCount) => `导出完成 · 已写入 ${entryCount} 条目录`,
    splitting: (mode) => `正在按${mode}拆分 PDF…`,
    splitComplete: (count) => `拆分完成 · 已生成 ${count} 个文件`,
    extractingImages: "正在提取 PDF 图片…",
    extractComplete: (count) => `提取完成 · 已导出 ${count} 张图片`,
    sampleLoaded: "已载入示例目录",
    sourceSelected: "已选择源 PDF",
    outputSelected: "已选择输出 PDF",
    folderSelected: "已选择拆分输出目录",
    noPathReveal: "当前没有可打开的路径",
    openedOutput: "已打开输出位置",
    unableOpen: "无法打开输出位置",
    noPathCopy: "当前没有可复制的路径",
    copied: "路径已复制到剪贴板",
    unableCopy: "无法复制路径",
    rangeRequired: "必须填写起始页和结束页",
    rangeAdded: "已添加自定义区间",
    rangeRemoved: "已删除自定义区间",
    noHierarchy: "尚未解析层级",
    levels: (count) => `${count} 级`,
    validationIssue: (level, lineNumber, message) => `${level.toUpperCase()} · 行 ${lineNumber ?? "-"} · ${message}`,
    noValidationIssues: "未发现校验问题。",
    placeholderSource: "/path/to/source.pdf",
    placeholderOutput: "/path/to/output.pdf",
    placeholderSplit: "/path/to/splits",
    placeholderLabel: "前言",
    placeholderStart: "1",
    placeholderEnd: "8",
    langLabel: "语言",
    zh: "中文",
    en: "English"
  },
  en: {
    appName: "PDF ToC Studio",
    heroTitle: "Handle PDF bookmarks, page mapping, and splitting with a native-feeling desktop flow.",
    heroBody: "Parse a plain-text table of contents, preview logical-to-physical page mapping, export bookmark-rich PDFs, or split output by page, chapter, and custom ranges.",
    sessionOverview: "Session Overview",
    workflow: "Workflow",
    splitModes: "Split Modes",
    statusLive: "Live",
    statusIdle: "Idle",
    tocLines: "TOC Lines",
    hierarchy: "Hierarchy",
    pdfPages: "PDF Pages",
    lastSplit: "Last Split",
    unknown: "Unknown",
    none: "None",
    workflowSteps: [
      "Set the source PDF and export target.",
      "Paste or refine the plain-text table of contents.",
      "Preview logical to physical page mapping.",
      "Export a bookmark PDF or split it into smaller files."
    ],
    splitModeTips: [
      "Page: create one PDF for each physical page.",
      "Chapter: use level-1 TOC entries as split anchors.",
      "Custom: accept `1-12` or `Preface:1-8` style ranges."
    ],
    loadSample: "Load Sample TOC",
    workbench: "Workbench",
    documentSetup: "Document Setup",
    inputHint: "Set paths, table of contents, and split strategy before running actions.",
    sourcePdf: "Source PDF",
    outputPdf: "Output PDF",
    browse: "Browse",
    saveAs: "Save As",
    pageOffset: "Page Offset",
    offsetRuleTitle: "Offset Rule",
    offsetRuleBody: "Physical page = logical page + offset",
    tocText: "TOC Text",
    previewMapping: "Preview Mapping",
    exportPdf: "Export PDF",
    splitPdf: "Split PDF",
    extractImages: "Extract Images",
    splitSection: "Split PDF",
    splitTitle: "Slice by page, chapter, or custom range",
    extractSection: "Extract Images",
    extractTitle: "Export embedded images from the PDF",
    extractFilterTitle: "Extraction Filters",
    titledImagesOnly: "Only keep titled images",
    titledImagesHint: "Prefer image object names, then detect nearby captions and use them for filenames.",
    byPage: "By Page",
    byChapter: "By Chapter",
    customRange: "Custom Range",
    splitOutputDirectory: "Split Output Directory",
    imageOutputDirectory: "Image Output Directory",
    minImageWidth: "Min Width",
    minImageHeight: "Min Height",
    minImageBytesKb: "Min Size (KB)",
    chooseFolder: "Choose Folder",
    splitHelpTitle: {
      page: "Per-page split",
      chapter: "Top-level chapter split",
      range: "Range split"
    },
    splitHelpBody: {
      page: "Create a dedicated PDF for every physical page.",
      chapter: "Split by the selected TOC level and preview matching chapter examples live.",
      range: "Support one range per line with optional labels."
    },
    splitLevel: "Split Level",
    splitLevelHint: "Use the selected TOC depth as the split anchor.",
    estimatedFiles: "Estimated Files",
    exampleEntries: "Example Entries",
    noChapterMatches: "No chapter entries match the current level.",
    includeSupplementary: "Include exercises / references",
    excludeSupplementaryHint: "Turn off to skip common back-matter style entries.",
    levelOption: (level) => `L${level}`,
    chapterCandidateCount: (count) => `${count} chapter candidates`,
    customBuilder: "Custom Builder",
    composeRanges: "Compose split ranges visually",
    rangesCount: (count) => `${count} ranges`,
    label: "Label",
    startPage: "Start Page",
    endPage: "End Page",
    addRange: "Add Range",
    remove: "Remove",
    noRanges: "No custom ranges yet. Add one above to begin splitting.",
    serializedRanges: "Serialized Ranges",
    results: "Results",
    parsedEntries: "Parsed Entries",
    rowsCount: (count) => `${count} rows`,
    level: "Level",
    title: "Title",
    logical: "Logical",
    physical: "Physical",
    noPreview: "No preview yet. Run a preview to inspect the parsed hierarchy.",
    validation: "Validation",
    checksAndExport: "Checks and export status",
    itemsCount: (count) => `${count} items`,
    splitResults: "Split Results",
    generatedSegments: "Generated segments",
    filesCount: (count) => `${count} files`,
    openFolder: "Open Folder",
    copyPath: "Copy Path",
    noSplit: "No split run yet.",
    noImages: "No images extracted yet.",
    imageResults: "Image Results",
    imageCount: (count) => `${count} images`,
    untitledImage: "Untitled image",
    consolePreview: "Console Preview",
    bridgeSnapshot: "Bridge output snapshot",
    noBridge: "No bridge preview yet.",
    lastExport: "Last Export",
    nothingExported: "Nothing exported in this session",
    lastSplitDirectory: "Last Split Directory",
    noSplitOutput: "No split output yet",
    lastImageDirectory: "Last Image Directory",
    noImageOutput: "No image output yet",
    extractFilterHint: "Use minimum width, height, and file size to skip icons and decorative assets.",
    previewStatus: "Ready for preview",
    previewGenerating: "Generating preview...",
    previewReady: (pageCount) => `Preview ready${pageCount ? ` · ${pageCount} pages detected` : ""}`,
    exporting: "Exporting PDF...",
    exportComplete: (entryCount) => `Export complete · ${entryCount} entries written`,
    splitting: (mode) => `Splitting PDF by ${mode}...`,
    splitComplete: (count) => `Split complete · ${count} files created`,
    extractingImages: "Extracting PDF images...",
    extractComplete: (count) => `Extraction complete · ${count} images exported`,
    sampleLoaded: "Sample TOC loaded",
    sourceSelected: "Source PDF selected",
    outputSelected: "Output PDF selected",
    folderSelected: "Split output directory selected",
    noPathReveal: "No path available to reveal",
    openedOutput: "Opened output location",
    unableOpen: "Unable to open output location",
    noPathCopy: "No path available to copy",
    copied: "Path copied to clipboard",
    unableCopy: "Unable to copy path",
    rangeRequired: "Range start and end pages are required",
    rangeAdded: "Custom range added",
    rangeRemoved: "Custom range removed",
    noHierarchy: "No hierarchy parsed",
    levels: (count) => `${count} level${count > 1 ? "s" : ""}`,
    validationIssue: (level, lineNumber, message) => `${level.toUpperCase()} line ${lineNumber ?? "-"}: ${message}`,
    noValidationIssues: "No validation issues detected.",
    placeholderSource: "/path/to/source.pdf",
    placeholderOutput: "/path/to/output.pdf",
    placeholderSplit: "/path/to/splits",
    placeholderLabel: "Preface",
    placeholderStart: "1",
    placeholderEnd: "8",
    langLabel: "Language",
    zh: "中文",
    en: "English"
  }
};

function countMeaningfulLines(text: string): number {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function summarizeDepth(entries: Entry[], strings: Copy): string {
  if (!entries.length) {
    return strings.noHierarchy;
  }

  const maxLevel = Math.max(...entries.map((entry) => entry.level));
  return strings.levels(maxLevel);
}

function formatIssues(lines: IssueLine[], strings: Copy): string[] {
  return lines.length
    ? lines.map((issue) => strings.validationIssue(issue.level, issue.lineNumber, issue.message))
    : [strings.noValidationIssues];
}

function resolveStatus(status: StatusState, strings: Copy): string {
  switch (status.kind) {
    case "previewStatus":
      return strings.previewStatus;
    case "previewGenerating":
      return strings.previewGenerating;
    case "previewReady":
      return strings.previewReady(status.pageCount);
    case "exporting":
      return strings.exporting;
    case "exportComplete":
      return strings.exportComplete(status.entryCount);
    case "splitting":
      return strings.splitting(status.mode);
    case "splitComplete":
      return strings.splitComplete(status.count);
    case "sampleLoaded":
      return strings.sampleLoaded;
    case "sourceSelected":
      return strings.sourceSelected;
    case "outputSelected":
      return strings.outputSelected;
    case "folderSelected":
      return strings.folderSelected;
    case "noPathReveal":
      return strings.noPathReveal;
    case "openedOutput":
      return strings.openedOutput;
    case "unableOpen":
      return strings.unableOpen;
    case "noPathCopy":
      return strings.noPathCopy;
    case "copied":
      return strings.copied;
    case "unableCopy":
      return strings.unableCopy;
    case "rangeRequired":
      return strings.rangeRequired;
    case "rangeAdded":
      return strings.rangeAdded;
    case "rangeRemoved":
      return strings.rangeRemoved;
    case "custom":
      return status.text;
  }
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

function parseChapterCandidates(tocText: string, offset: number): ChapterCandidate[] {
  return tocText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const expanded = line.replace(/\t/g, "    ");
      const indentChars = expanded.length - expanded.trimStart().length;
      const level = Math.floor(indentChars / 4) + 1;
      const match = expanded.match(/^\s*(.*?)\s+(\d+)\s*$/);
      if (!match) {
        return null;
      }

      return {
        level,
        title: match[1].trim(),
        logicalPage: Number(match[2]),
        physicalPage: Number(match[2]) + offset
      };
    })
    .filter((entry): entry is ChapterCandidate => Boolean(entry));
}

function isSupplementaryTitle(title: string): boolean {
  const normalized = title.replace(/\s+/g, "");
  return ["思考题", "参考文献", "Exercises", "References"].includes(normalized);
}

function toErrorIssue(message: string): IssueLine[] {
  return [{ level: "error", message }];
}

export function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const strings = copy[language];
  const [sourcePdf, setSourcePdf] = useState("../航空电子技术（正文）.pdf");
  const [outputPdf, setOutputPdf] = useState("../pdf-toc-studio-output-tauri.pdf");
  const [offset, setOffset] = useState("8");
  const [tocText, setTocText] = useState(sampleToc);
  const [previewEntries, setPreviewEntries] = useState<Entry[]>([]);
  const [previewRows, setPreviewRows] = useState<string[]>([]);
  const [issueLines, setIssueLines] = useState<IssueLine[]>([]);
  const [statusState, setStatusState] = useState<StatusState>({ kind: "previewStatus" });
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [lastExportPath, setLastExportPath] = useState("");
  const [splitMode, setSplitMode] = useState<"page" | "chapter" | "range">("page");
  const [splitLevel, setSplitLevel] = useState<1 | 2 | 3>(1);
  const [includeSupplementary, setIncludeSupplementary] = useState(false);
  const [splitOutputDir, setSplitOutputDir] = useState("../pdf-splits");
  const [imageOutputDir, setImageOutputDir] = useState("../pdf-images");
  const [minImageWidth, setMinImageWidth] = useState("320");
  const [minImageHeight, setMinImageHeight] = useState("240");
  const [minImageBytesKb, setMinImageBytesKb] = useState("24");
  const [requireImageTitle, setRequireImageTitle] = useState(false);
  const [customRangesText, setCustomRangesText] = useState(sampleRanges);
  const [rangeItems, setRangeItems] = useState<RangeItem[]>(() => parseRangeItems(sampleRanges));
  const [rangeDraftLabel, setRangeDraftLabel] = useState("");
  const [rangeDraftStart, setRangeDraftStart] = useState("");
  const [rangeDraftEnd, setRangeDraftEnd] = useState("");
  const [splitSegments, setSplitSegments] = useState<SplitSegment[]>([]);
  const [lastSplitDir, setLastSplitDir] = useState("");
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [lastImageDir, setLastImageDir] = useState("");

  const tocLineCount = useMemo(() => countMeaningfulLines(tocText), [tocText]);
  const previewDepth = useMemo(() => summarizeDepth(previewEntries, strings), [previewEntries, strings]);
  const issues = useMemo(() => formatIssues(issueLines, strings), [issueLines, strings]);
  const status = useMemo(() => resolveStatus(statusState, strings), [statusState, strings]);
  const chapterCandidates = useMemo(
    () =>
      parseChapterCandidates(tocText, Number(offset || 0))
        .filter((entry) => entry.level === splitLevel)
        .filter((entry) => includeSupplementary || !isSupplementaryTitle(entry.title)),
    [tocText, offset, splitLevel, includeSupplementary]
  );
  const chapterPreviewCandidates = useMemo(() => chapterCandidates.slice(0, 4), [chapterCandidates]);
  const canExport = sourcePdf.trim().length > 0 && outputPdf.trim().length > 0 && tocText.trim().length > 0;
  const canSplit =
    sourcePdf.trim().length > 0 &&
    splitOutputDir.trim().length > 0 &&
    (splitMode !== "chapter" || tocText.trim().length > 0) &&
    (splitMode !== "range" || customRangesText.trim().length > 0);
  const canExtractImages = sourcePdf.trim().length > 0 && imageOutputDir.trim().length > 0;

  async function handlePreview() {
    setStatusState({ kind: "previewGenerating" });
    try {
      const result = await previewMapping({
        sourcePdf,
        tocText,
        offset: Number(offset || 0)
      });
      applyPreview(result);
    } catch (error) {
      applyPreview({ ok: false, entries: [], previewRows: [], issues: [], pageCount: null, error: String(error) });
    }
  }

  async function handleExport() {
    setStatusState({ kind: "exporting" });
    try {
      const previewResult = await previewMapping({
        sourcePdf,
        tocText,
        offset: Number(offset || 0)
      });
      if (!previewResult.ok) {
        applyPreview(previewResult);
        return;
      }
      applyPreview(previewResult);

      const result = await exportPdf({
        sourcePdf,
        outputPdf,
        tocText,
        offset: Number(offset || 0)
      });
      applyExport(result);
    } catch (error) {
      applyExport({ ok: false, outputPdf: "", entryCount: 0, issues: [], error: String(error) });
    }
  }

  async function handleSplit() {
    const modeLabel = splitMode === "page" ? strings.byPage : splitMode === "chapter" ? strings.byChapter : strings.customRange;
    setStatusState({ kind: "splitting", mode: modeLabel });
    try {
      if (tocText.trim()) {
        const previewResult = await previewMapping({
          sourcePdf,
          tocText,
          offset: Number(offset || 0)
        });
        if (!previewResult.ok) {
          applyPreview(previewResult);
          return;
        }
        applyPreview(previewResult);
      }

      const result = await splitPdf({
        sourcePdf,
        outputDir: splitOutputDir,
        splitMode,
        tocText,
        offset: Number(offset || 0),
        rangesText: customRangesText,
        splitLevel,
        includeSupplementary
      });
      applySplit(result);
    } catch (error) {
      applySplit({ ok: false, outputDir: "", segmentCount: 0, segments: [], issues: [], error: String(error) });
    }
  }

  function loadSample() {
    setOffset("8");
    setTocText(sampleToc);
    setSplitLevel(1);
    setIncludeSupplementary(false);
    setImageOutputDir("../pdf-images");
    setMinImageWidth("320");
    setMinImageHeight("240");
    setMinImageBytesKb("24");
    setRequireImageTitle(false);
    setCustomRangesText(sampleRanges);
    setRangeItems(parseRangeItems(sampleRanges));
    setRangeDraftLabel("");
    setRangeDraftStart("");
    setRangeDraftEnd("");
    setStatusState({ kind: "sampleLoaded" });
  }

  async function handlePickSourcePdf() {
    const selected = await pickPdfFile();
    if (selected) {
      setSourcePdf(selected);
      setStatusState({ kind: "sourceSelected" });
    }
  }

  async function handlePickOutputPdf() {
    const suggestedName = outputPdf.split("/").pop() || "output.pdf";
    const selected = await savePdfFile(suggestedName);
    if (selected) {
      setOutputPdf(selected);
      setStatusState({ kind: "outputSelected" });
    }
  }

  async function handlePickSplitDir() {
    const selected = await pickOutputDirectory();
    if (selected) {
      setSplitOutputDir(selected);
      setStatusState({ kind: "folderSelected" });
    }
  }

  async function handlePickImageDir() {
    const selected = await pickOutputDirectory();
    if (selected) {
      setImageOutputDir(selected);
      setStatusState({ kind: "folderSelected" });
    }
  }

  async function handleRevealPath(path: string) {
    if (!path) {
      setStatusState({ kind: "noPathReveal" });
      return;
    }

    const ok = await revealPath(path);
    setStatusState({ kind: ok ? "openedOutput" : "unableOpen" });
  }

  async function handleCopyPath(path: string) {
    if (!path) {
      setStatusState({ kind: "noPathCopy" });
      return;
    }

    try {
      await navigator.clipboard.writeText(path);
      setStatusState({ kind: "copied" });
    } catch {
      setStatusState({ kind: "unableCopy" });
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
      setStatusState({ kind: "rangeRequired" });
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
    setStatusState({ kind: "rangeAdded" });
  }

  function updateRangeItem(id: string, field: "label" | "startPage" | "endPage", value: string) {
    syncRanges(rangeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function removeRangeItem(id: string) {
    syncRanges(rangeItems.filter((item) => item.id !== id));
    setStatusState({ kind: "rangeRemoved" });
  }

  function applyPreview(result: PreviewResult) {
    if (!result.ok) {
      setIssueLines(toErrorIssue(result.error ?? strings.previewMapping));
      setStatusState(result.error ? { kind: "custom", text: result.error } : { kind: "previewStatus" });
      return;
    }

    setPreviewEntries(result.entries);
    setPreviewRows(result.previewRows);
    setPageCount(result.pageCount);
    setIssueLines(result.issues);
    setStatusState({ kind: "previewReady", pageCount: result.pageCount });
  }

  function applyExport(result: ExportResult) {
    if (!result.ok) {
      setIssueLines(toErrorIssue(result.error ?? strings.exportPdf));
      setStatusState({ kind: "custom", text: result.error ?? strings.exportPdf });
      return;
    }

    setLastExportPath(result.outputPdf);
    setIssueLines(result.issues);
    setStatusState({ kind: "exportComplete", entryCount: result.entryCount });
  }

  function applySplit(result: SplitResult) {
    if (!result.ok) {
      setSplitSegments([]);
      setIssueLines(toErrorIssue(result.error ?? strings.splitPdf));
      setStatusState({ kind: "custom", text: result.error ?? strings.splitPdf });
      return;
    }

    setSplitSegments(result.segments);
    setLastSplitDir(result.outputDir);
    setIssueLines(result.issues);
    setStatusState({ kind: "splitComplete", count: result.segmentCount });
  }

  async function handleExtractImages() {
    setStatusState({ kind: "custom", text: strings.extractingImages });
    try {
      const result = await extractPdfImages({
        sourcePdf,
        outputDir: imageOutputDir,
        minWidth: Number(minImageWidth || 0),
        minHeight: Number(minImageHeight || 0),
        minBytes: Number(minImageBytesKb || 0) * 1024,
        requireTitle: requireImageTitle
      });
      applyExtractImages(result);
    } catch (error) {
      applyExtractImages({ ok: false, outputDir: "", imageCount: 0, images: [], error: String(error) });
    }
  }

  function applyExtractImages(result: ExtractImagesResult) {
    if (!result.ok) {
      setExtractedImages([]);
      setIssueLines(toErrorIssue(result.error ?? strings.extractImages));
      setStatusState({ kind: "custom", text: result.error ?? strings.extractImages });
      return;
    }

    setExtractedImages(result.images);
    setLastImageDir(result.outputDir);
    setStatusState({ kind: "custom", text: strings.extractComplete(result.imageCount) });
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop" aria-hidden="true" />

      <header className="masthead">
        <div className="masthead-bar">
          <div className="brand-lockup">
            <span className="product-mark">PTS</span>
            <div>
              <p className="eyebrow">{strings.appName}</p>
              <h1 className="brand-title">{strings.workbench}</h1>
            </div>
          </div>
          <div className="masthead-actions">
            <div className="status-ribbon">
              <span>{strings.sessionOverview}</span>
              <strong>{status}</strong>
            </div>
            <div className="lang-switch" aria-label={strings.langLabel}>
              <button
                type="button"
                className={language === "zh" ? "lang-button is-active" : "lang-button"}
                onClick={() => setLanguage("zh")}
              >
                {strings.zh}
              </button>
              <button
                type="button"
                className={language === "en" ? "lang-button is-active" : "lang-button"}
                onClick={() => setLanguage("en")}
              >
                {strings.en}
              </button>
            </div>
          </div>
        </div>

        <div className="masthead-grid">
          <section className="hero-panel hero-sheet">
            <div className="hero-glow" aria-hidden="true" />
            <div className="hero-copy">
              <h2>{strings.heroTitle}</h2>
              <p>{strings.heroBody}</p>
            </div>
            <div className="hero-meta">
              <button className="ghost-button" onClick={loadSample}>
                {strings.loadSample}
              </button>
              <div className="session-badge">
                <span>{previewEntries.length || splitSegments.length || extractedImages.length ? strings.statusLive : strings.statusIdle}</span>
                <strong>{strings.appName}</strong>
              </div>
            </div>
            <div className="metric-strip">
              <article className="metric-tile">
                <span>{strings.tocLines}</span>
                <strong>{tocLineCount}</strong>
              </article>
              <article className="metric-tile">
                <span>{strings.hierarchy}</span>
                <strong>{previewDepth}</strong>
              </article>
              <article className="metric-tile">
                <span>{strings.pdfPages}</span>
                <strong>{pageCount ?? strings.unknown}</strong>
              </article>
              <article className="metric-tile">
                <span>{strings.lastSplit}</span>
                <strong>{splitSegments.length || strings.none}</strong>
              </article>
              <article className="metric-tile">
                <span>{strings.imageResults}</span>
                <strong>{extractedImages.length || strings.none}</strong>
              </article>
            </div>
          </section>

          <aside className="overview-dock">
            <section className="info-panel">
              <div className="panel-heading-block">
                <p className="section-kicker">{strings.workflow}</p>
                <h2>{strings.documentSetup}</h2>
              </div>
              <p className="dock-copy">{strings.inputHint}</p>
              <ol className="workflow-list compact-list">
                {strings.workflowSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="info-panel">
              <div className="panel-heading-block">
                <p className="section-kicker">{strings.splitModes}</p>
                <h2>{strings.byChapter}</h2>
              </div>
              <ul className="tip-list compact-list">
                {strings.splitModeTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </header>

      <main className="canvas-grid">
        <section className="studio-panel controls-panel">
          <div className="window-toolbar">
            <div className="traffic-lights" aria-hidden="true">
              <span className="dot dot-close" />
              <span className="dot dot-minimize" />
              <span className="dot dot-expand" />
            </div>
            <div className="toolbar-title">
              <strong>{strings.documentSetup}</strong>
              <span>{strings.sourcePdf} / {strings.outputPdf} / {strings.pageOffset}</span>
            </div>
            <div className="toolbar-status">{status}</div>
          </div>

          <div className="workbench-content">
            <div className="form-grid">
              <label className="field field-span-2">
                <span>{strings.sourcePdf}</span>
                <div className="input-with-button">
                  <input value={sourcePdf} onChange={(event) => setSourcePdf(event.target.value)} placeholder={strings.placeholderSource} />
                  <button type="button" className="input-action-button" onClick={handlePickSourcePdf}>
                    {strings.browse}
                  </button>
                </div>
              </label>
              <label className="field field-span-2">
                <span>{strings.outputPdf}</span>
                <div className="input-with-button">
                  <input value={outputPdf} onChange={(event) => setOutputPdf(event.target.value)} placeholder={strings.placeholderOutput} />
                  <button type="button" className="input-action-button" onClick={handlePickOutputPdf}>
                    {strings.saveAs}
                  </button>
                </div>
              </label>
              <label className="field field-compact">
                <span>{strings.pageOffset}</span>
                <input value={offset} onChange={(event) => setOffset(event.target.value)} inputMode="numeric" />
              </label>
              <div className="helper-card">
                <strong>{strings.offsetRuleTitle}</strong>
                <p>{strings.offsetRuleBody}</p>
              </div>
            </div>

            <label className="field">
              <span>{strings.tocText}</span>
              <textarea value={tocText} onChange={(event) => setTocText(event.target.value)} />
            </label>

            <div className="action-row">
              <button onClick={handlePreview}>{strings.previewMapping}</button>
                <button className="secondary-button" onClick={handleExport} disabled={!canExport}>
                  {strings.exportPdf}
                </button>
              </div>

            <div className="operations-stack">
              <section className="operation-module split-panel">
                <div className="section-header compact">
                  <div>
                    <p className="section-kicker">{strings.splitSection}</p>
                    <h2>{strings.splitTitle}</h2>
                  </div>
                </div>

                <div className="segmented-control" role="tablist" aria-label={strings.splitModes}>
                  {([
                    ["page", strings.byPage],
                    ["chapter", strings.byChapter],
                    ["range", strings.customRange]
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={mode === splitMode ? "segment-button is-active" : "segment-button"}
                      onClick={() => setSplitMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="split-grid">
                  <label className="field">
                    <span>{strings.splitOutputDirectory}</span>
                    <div className="input-with-button">
                      <input value={splitOutputDir} onChange={(event) => setSplitOutputDir(event.target.value)} placeholder={strings.placeholderSplit} />
                      <button type="button" className="input-action-button" onClick={handlePickSplitDir}>
                        {strings.chooseFolder}
                      </button>
                    </div>
                  </label>

                  <div className="helper-card split-mode-card">
                    <strong>{strings.splitHelpTitle[splitMode]}</strong>
                    <p>{strings.splitHelpBody[splitMode]}</p>
                  </div>
                </div>

                {splitMode === "chapter" ? (
                  <div className="chapter-builder">
                    <div className="chapter-controls">
                      <div className="chapter-level-picker">
                        <div className="field">
                          <span>{strings.splitLevel}</span>
                          <div className="segmented-control compact-control" role="tablist" aria-label={strings.splitLevel}>
                            {[1, 2, 3].map((level) => (
                              <button
                                key={level}
                                type="button"
                                className={level === splitLevel ? "segment-button is-active" : "segment-button"}
                                onClick={() => setSplitLevel(level as 1 | 2 | 3)}
                              >
                                {strings.levelOption(level)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="chapter-helper">{strings.splitLevelHint}</p>
                      </div>

                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={includeSupplementary}
                          onChange={(event) => setIncludeSupplementary(event.target.checked)}
                        />
                        <div>
                          <strong>{strings.includeSupplementary}</strong>
                          <p>{strings.excludeSupplementaryHint}</p>
                        </div>
                      </label>
                    </div>

                    <div className="chapter-preview-grid">
                      <div className="helper-card">
                        <strong>{strings.estimatedFiles}</strong>
                        <p>{strings.chapterCandidateCount(chapterCandidates.length)}</p>
                      </div>
                      <div className="helper-card">
                        <strong>{strings.exampleEntries}</strong>
                        <div className="chapter-example-list">
                          {chapterPreviewCandidates.length ? (
                            chapterPreviewCandidates.map((entry) => (
                              <div key={`${entry.level}-${entry.title}-${entry.logicalPage}`} className="chapter-example-item">
                                <span>{entry.title}</span>
                                <strong>
                                  {strings.logical} {entry.logicalPage} · {strings.physical} {entry.physicalPage}
                                </strong>
                              </div>
                            ))
                          ) : (
                            <p>{strings.noChapterMatches}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {splitMode === "range" ? (
                  <div className="range-builder">
                    <div className="range-builder-header">
                      <div>
                        <p className="section-kicker">{strings.customBuilder}</p>
                        <h3>{strings.composeRanges}</h3>
                      </div>
                      <span className="badge neutral">{strings.rangesCount(rangeItems.length)}</span>
                    </div>

                    <div className="range-draft-grid">
                      <label className="field">
                        <span>{strings.label}</span>
                        <input value={rangeDraftLabel} onChange={(event) => setRangeDraftLabel(event.target.value)} placeholder={strings.placeholderLabel} />
                      </label>
                      <label className="field">
                        <span>{strings.startPage}</span>
                        <input
                          value={rangeDraftStart}
                          onChange={(event) => setRangeDraftStart(event.target.value)}
                          inputMode="numeric"
                          placeholder={strings.placeholderStart}
                        />
                      </label>
                      <label className="field">
                        <span>{strings.endPage}</span>
                        <input
                          value={rangeDraftEnd}
                          onChange={(event) => setRangeDraftEnd(event.target.value)}
                          inputMode="numeric"
                          placeholder={strings.placeholderEnd}
                        />
                      </label>
                      <div className="range-builder-action">
                        <button type="button" className="secondary-button" onClick={addRangeItem}>
                          {strings.addRange}
                        </button>
                      </div>
                    </div>

                    <div className="range-list">
                      {rangeItems.length ? (
                        rangeItems.map((item) => (
                          <div key={item.id} className="range-item">
                            <input value={item.label} onChange={(event) => updateRangeItem(item.id, "label", event.target.value)} placeholder={strings.label} />
                            <input
                              value={item.startPage}
                              onChange={(event) => updateRangeItem(item.id, "startPage", event.target.value)}
                              inputMode="numeric"
                              placeholder={strings.startPage}
                            />
                            <input
                              value={item.endPage}
                              onChange={(event) => updateRangeItem(item.id, "endPage", event.target.value)}
                              inputMode="numeric"
                              placeholder={strings.endPage}
                            />
                            <button type="button" className="icon-button" onClick={() => removeRangeItem(item.id)}>
                              {strings.remove}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">{strings.noRanges}</div>
                      )}
                    </div>

                    <label className="field">
                      <span>{strings.serializedRanges}</span>
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
                    {strings.splitPdf}
                  </button>
                </div>
              </section>

              <section className="operation-module extract-panel">
                <div className="section-header compact">
                  <div>
                    <p className="section-kicker">{strings.extractSection}</p>
                    <h2>{strings.extractTitle}</h2>
                  </div>
                </div>

                <div className="split-grid">
                  <label className="field">
                    <span>{strings.imageOutputDirectory}</span>
                    <div className="input-with-button">
                      <input value={imageOutputDir} onChange={(event) => setImageOutputDir(event.target.value)} placeholder={strings.placeholderSplit} />
                      <button type="button" className="input-action-button" onClick={handlePickImageDir}>
                        {strings.chooseFolder}
                      </button>
                    </div>
                  </label>

                  <div className="helper-card split-mode-card">
                    <strong>{strings.extractImages}</strong>
                    <p>{strings.extractTitle}</p>
                  </div>
                </div>

                <div className="extract-filter-grid">
                  <div className="helper-card">
                    <strong>{strings.extractFilterTitle}</strong>
                    <p>{strings.extractFilterHint}</p>
                  </div>
                  <label className="field">
                    <span>{strings.minImageWidth}</span>
                    <input value={minImageWidth} onChange={(event) => setMinImageWidth(event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="field">
                    <span>{strings.minImageHeight}</span>
                    <input value={minImageHeight} onChange={(event) => setMinImageHeight(event.target.value)} inputMode="numeric" />
                  </label>
                  <label className="field">
                    <span>{strings.minImageBytesKb}</span>
                    <input value={minImageBytesKb} onChange={(event) => setMinImageBytesKb(event.target.value)} inputMode="numeric" />
                  </label>
                </div>

                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={requireImageTitle}
                    onChange={(event) => setRequireImageTitle(event.target.checked)}
                  />
                  <div>
                    <strong>{strings.titledImagesOnly}</strong>
                    <p>{strings.titledImagesHint}</p>
                  </div>
                </label>

                <div className="action-row split-actions">
                  <button className="secondary-button" onClick={handleExtractImages} disabled={!canExtractImages}>
                    {strings.extractImages}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="results-column">
          <section className="studio-panel results-main">
            <div className="section-header">
              <div>
                <p className="section-kicker">{strings.results}</p>
                <h2>{strings.parsedEntries}</h2>
              </div>
              <span className="badge">{strings.rowsCount(previewEntries.length)}</span>
            </div>

            <div className="table-wrap">
              {previewEntries.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>{strings.level}</th>
                      <th>{strings.title}</th>
                      <th>{strings.logical}</th>
                      <th>{strings.physical}</th>
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
                <div className="empty-state">{strings.noPreview}</div>
              )}
            </div>
          </section>

          <section className="studio-panel stacked-panel results-side">
            <div className="section-header results-section-header">
              <div>
                <p className="section-kicker">{strings.validation}</p>
                <h2>{strings.checksAndExport}</h2>
              </div>
              <span className="badge neutral">{strings.itemsCount(issues.length)}</span>
            </div>

            <div className="log-block log-card validation-card">
              {issues.map((issue) => (
                <div key={issue}>{issue}</div>
              ))}
            </div>

            <div className="section-header compact results-section-header">
              <div>
                <p className="section-kicker">{strings.splitResults}</p>
                <h2>{strings.generatedSegments}</h2>
              </div>
              <span className="badge neutral">{strings.filesCount(splitSegments.length)}</span>
            </div>
            <div className="log-block muted log-card asset-card">
              {splitSegments.length ? (
                splitSegments.map((segment) => (
                  <div key={segment.outputPdf} className="segment-result asset-entry">
                    <div className="asset-title">
                      {segment.label} · {strings.startPage} {segment.startPage} - {strings.endPage} {segment.endPage}
                    </div>
                    <div className="segment-path">{segment.outputPdf}</div>
                    <div className="summary-actions inline-actions">
                      <button type="button" className="tiny-button utility-button" onClick={() => handleRevealPath(segment.outputPdf)}>
                        {strings.openFolder}
                      </button>
                      <button type="button" className="tiny-button utility-button" onClick={() => handleCopyPath(segment.outputPdf)}>
                        {strings.copyPath}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div>{strings.noSplit}</div>
              )}
            </div>

            <div className="section-header compact results-section-header">
              <div>
                <p className="section-kicker">{strings.consolePreview}</p>
                <h2>{strings.bridgeSnapshot}</h2>
              </div>
            </div>
            <div className="log-block muted log-card bridge-card">
              {previewRows.length ? previewRows.map((row) => <div key={row}>{row}</div>) : <div>{strings.noBridge}</div>}
            </div>

            <div className="section-header compact results-section-header">
              <div>
                <p className="section-kicker">{strings.extractSection}</p>
                <h2>{strings.imageResults}</h2>
              </div>
              <span className="badge neutral">{strings.imageCount(extractedImages.length)}</span>
            </div>
            <div className="log-block muted log-card asset-card">
              {extractedImages.length ? (
                extractedImages.map((image) => (
                  <div key={image.outputPath} className="segment-result asset-entry">
                    <div className="asset-title">
                      {image.title || strings.untitledImage}
                    </div>
                    <div className="segment-path">p{image.pageNumber} · {image.width}×{image.height} · {image.extension}</div>
                    <div className="segment-path">{image.outputPath}</div>
                    <div className="summary-actions inline-actions">
                      <button type="button" className="tiny-button utility-button" onClick={() => handleRevealPath(image.outputPath)}>
                        {strings.openFolder}
                      </button>
                      <button type="button" className="tiny-button utility-button" onClick={() => handleCopyPath(image.outputPath)}>
                        {strings.copyPath}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div>{strings.noImages}</div>
              )}
            </div>

            <div className="export-summary summary-card">
              <span>{strings.lastExport}</span>
              <strong>{lastExportPath || strings.nothingExported}</strong>
              <div className="summary-actions">
                <button type="button" className="tiny-button utility-button" onClick={() => handleRevealPath(lastExportPath)} disabled={!lastExportPath}>
                  {strings.openFolder}
                </button>
                <button type="button" className="tiny-button utility-button" onClick={() => handleCopyPath(lastExportPath)} disabled={!lastExportPath}>
                  {strings.copyPath}
                </button>
              </div>
            </div>
            <div className="export-summary summary-card">
              <span>{strings.lastSplitDirectory}</span>
              <strong>{lastSplitDir || strings.noSplitOutput}</strong>
              <div className="summary-actions">
                <button type="button" className="tiny-button utility-button" onClick={() => handleRevealPath(lastSplitDir)} disabled={!lastSplitDir}>
                  {strings.openFolder}
                </button>
                <button type="button" className="tiny-button utility-button" onClick={() => handleCopyPath(lastSplitDir)} disabled={!lastSplitDir}>
                  {strings.copyPath}
                </button>
              </div>
            </div>
            <div className="export-summary summary-card">
              <span>{strings.lastImageDirectory}</span>
              <strong>{lastImageDir || strings.noImageOutput}</strong>
              <div className="summary-actions">
                <button type="button" className="tiny-button utility-button" onClick={() => handleRevealPath(lastImageDir)} disabled={!lastImageDir}>
                  {strings.openFolder}
                </button>
                <button type="button" className="tiny-button utility-button" onClick={() => handleCopyPath(lastImageDir)} disabled={!lastImageDir}>
                  {strings.copyPath}
                </button>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
