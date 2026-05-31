export interface ConversionMetadata {
  source_file?: string;
  source_format?: string;
  source_extension?: string;
  source_size_bytes?: number;
  markdown_length?: number;
  conversion_time_seconds?: number;
}

export interface DocumentFile {
  id: string;
  name: string;
  path: string;
  extension: string;
  size: number;
}

export interface ConversionResult {
  success: boolean;
  markdown: string;
  error?: string;
  filename?: string;
  metadata?: ConversionMetadata;
}

export interface HealthResult {
  available: boolean;
  engine?: string;
  version?: string;
  error?: string;
}

export interface ExportRequest {
  content: string;
  path: string;
  filename: string;
}

export interface ExportResult {
  success: boolean;
  file_path: string;
  error?: string;
}

export interface ExportFileEntry {
  content: string;
  filename: string;
}

export interface BatchExportRequest {
  files: ExportFileEntry[];
  output_dir: string;
}

export interface BatchExportResult {
  success: boolean;
  results: ExportResult[];
  output_dir: string;
}

export interface AppState {
  files: DocumentFile[];
  selectedFile: DocumentFile | null;
  markdownContent: string;
  isConverting: boolean;
  conversionError: string | null;
  activeView: "preview" | "markdown";
  isLoading: boolean;
  backendReady: boolean;
}

export type ViewMode = "preview" | "markdown";

export const SUPPORTED_EXTENSIONS = [
  ".pdf", ".epub", ".docx", ".pptx",
  ".xlsx", ".html", ".htm", ".csv",
  ".json", ".xml", ".jpg", ".jpeg",
  ".png", ".gif", ".bmp", ".tiff",
  ".mp3", ".wav", ".zip",
];
