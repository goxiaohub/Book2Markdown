import { invoke } from "@tauri-apps/api/core";
import type {
  ConversionResult, HealthResult, ExportRequest, ExportResult,
  BatchExportRequest, BatchExportResult,
} from "../types";

// ---- 后端通信 ----

export async function healthCheck(): Promise<HealthResult> {
  return invoke<HealthResult>("health_check");
}

export async function convertDocument(filePath: string): Promise<ConversionResult> {
  return invoke<ConversionResult>("convert_document", { filePath });
}

// ---- 导出 ----

export async function exportMarkdown(request: ExportRequest): Promise<ExportResult> {
  return invoke<ExportResult>("export_markdown", { request });
}

export async function batchExport(request: BatchExportRequest): Promise<BatchExportResult> {
  return invoke<BatchExportResult>("batch_export", { request });
}

export async function revealInExplorer(targetPath: string): Promise<boolean> {
  return invoke<boolean>("reveal_in_explorer", { targetPath });
}

// ---- 应用信息 ----

export async function getAppInfo(): Promise<{
  name: string;
  version: string;
  python_path: string;
  python_version: string | null;
  backend_dir: string;
}> {
  return invoke("get_app_info");
}

// ---- 环境检测 ----

export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

// ---- 浏览器回退 ----

export async function mockConvertDocument(
  filePath: string,
  fileName: string
): Promise<ConversionResult> {
  console.warn("[Mock] Using browser fallback for conversion:", filePath);
  return {
    success: true,
    markdown: `# ${fileName}\n\n> 浏览器模拟模式\n\n此文件需要在 Tauri 桌面应用中才能实际转换。\n\n路径: \`${filePath}\`\n`,
    filename: fileName.replace(/\.[^.]+$/, "") + ".md",
    metadata: {
      source_file: fileName,
      source_extension: fileName.split(".").pop() ?? "",
      markdown_length: 0,
      conversion_time_seconds: 0,
    },
  };
}
