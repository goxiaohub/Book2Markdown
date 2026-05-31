import type { ReactNode } from "react";
import type { DocumentFile, ViewMode, ConversionMetadata } from "../types";
import {
  FileText, Play, X, RefreshCw, Loader2,
  Clock, FileSize, Hash, AlertTriangle,
} from "lucide-react";

interface ConverterProps {
  file: DocumentFile;
  markdownContent: string;
  isConverting: boolean;
  conversionError: string | null;
  activeView: ViewMode;
  metadata?: ConversionMetadata;
  onConvert: () => void;
  onClear: () => void;
  onViewChange: (view: ViewMode) => void;
  children: ReactNode;
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(0);
  return `${m}m ${s}s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 转换状态枚举
type ConvState = "idle" | "converting" | "done" | "error";

function getConvState(
  isConverting: boolean,
  hasContent: boolean,
  hasError: boolean
): ConvState {
  if (isConverting) return "converting";
  if (hasError) return "error";
  if (hasContent) return "done";
  return "idle";
}

export default function Converter({
  file,
  markdownContent,
  isConverting,
  conversionError,
  activeView,
  metadata,
  onConvert,
  onClear,
  onViewChange,
  children,
}: ConverterProps) {
  const convState = getConvState(
    isConverting,
    !!markdownContent,
    !!conversionError
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 文件信息 + 操作栏 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-obsidian-border bg-obsidian-surface/50 shrink-0">
        <FileText className="w-4 h-4 text-obsidian-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-sm text-obsidian-text truncate font-medium block">
            {file.name}
          </span>
          {metadata && (
            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-obsidian-muted">
              {metadata.source_format && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {metadata.source_format}
                </span>
              )}
              {metadata.source_size_bytes != null && (
                <span className="flex items-center gap-1">
                  <FileSize className="w-3 h-3" />
                  {formatSize(metadata.source_size_bytes)}
                </span>
              )}
              {metadata.conversion_time_seconds != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(metadata.conversion_time_seconds)}
                </span>
              )}
              {metadata.markdown_length != null && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {metadata.markdown_length.toLocaleString()} 字符
                </span>
              )}
            </div>
          )}
        </div>

        <span
          className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
            convState === "done"
              ? "bg-obsidian-success/20 text-obsidian-success"
              : convState === "error"
              ? "bg-obsidian-error/20 text-obsidian-error"
              : "bg-obsidian-border/50 text-obsidian-muted"
          }`}
        >
          {convState === "converting"
            ? "转换中"
            : convState === "done"
            ? "已完成"
            : convState === "error"
            ? "失败"
            : file.extension.toUpperCase().replace(".", "")}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {/* 视图切换 - 仅在有内容时显示 */}
          {convState === "done" && (
            <div className="flex bg-obsidian-bg rounded-md border border-obsidian-border overflow-hidden">
              <button
                onClick={() => onViewChange("preview")}
                className={`px-3 py-1 text-xs transition-colors ${
                  activeView === "preview"
                    ? "bg-obsidian-accent text-white"
                    : "text-obsidian-muted hover:text-obsidian-text"
                }`}
              >
                预览
              </button>
              <button
                onClick={() => onViewChange("markdown")}
                className={`px-3 py-1 text-xs transition-colors ${
                  activeView === "markdown"
                    ? "bg-obsidian-accent text-white"
                    : "text-obsidian-muted hover:text-obsidian-text"
                }`}
              >
                源码
              </button>
            </div>
          )}

          {/* 主操作按钮 */}
          {convState === "idle" && (
            <button
              onClick={onConvert}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-accent hover:bg-obsidian-accent-hover text-white text-xs rounded-md transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              转换
            </button>
          )}

          {convState === "converting" && (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-accent/50 text-white text-xs rounded-md cursor-wait"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              转换中...
            </button>
          )}

          {(convState === "done" || convState === "error") && (
            <button
              onClick={onConvert}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-surface hover:bg-obsidian-border text-obsidian-text text-xs rounded-md transition-colors border border-obsidian-border"
              title="重新转换"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 关闭按钮 */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-md hover:bg-obsidian-border text-obsidian-muted hover:text-obsidian-text transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 转换错误 */}
      {convState === "error" && conversionError && (
        <div className="mx-4 mt-3 p-3 bg-obsidian-error/10 border border-obsidian-error/30 rounded-lg text-xs text-red-400 animate-fade-in flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-0.5">转换失败</p>
            <p className="text-obsidian-muted">{conversionError}</p>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {convState === "converting" && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-obsidian-accent animate-spin" />
                <div className="absolute inset-0 w-10 h-10 rounded-full pulse-glow" />
              </div>
              <div className="text-center">
                <p className="text-sm text-obsidian-text font-medium">
                  正在转换文档
                </p>
                <p className="text-xs text-obsidian-muted mt-1">
                  {file.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {convState === "idle" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-fade-in">
              <div className="p-4 rounded-full bg-obsidian-surface mb-3 inline-block">
                <Play className="w-8 h-8 text-obsidian-accent" />
              </div>
              <p className="text-sm text-obsidian-text font-medium mb-1">
                准备就绪
              </p>
              <p className="text-xs text-obsidian-muted">
                点击上方「转换」按钮开始处理
              </p>
            </div>
          </div>
        )}

        {convState === "done" && children}
      </div>
    </div>
  );
}
