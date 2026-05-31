import { useState, useCallback, useRef, useEffect } from "react";
import { exportMarkdown, isTauriEnvironment } from "../utils/tauri-bridge";
import {
  Download, Check, Loader2, ChevronDown,
  FolderOpen, FileDown, History, ExternalLink,
} from "lucide-react";

interface ExporterProps {
  markdownContent: string;
  filename?: string;
  disabled: boolean;
}

interface ExportRecord {
  filename: string;
  path: string;
  timestamp: number;
}

const MAX_HISTORY = 5;

function sanitizeFilename(name: string): string {
  // 移除扩展名，清理非法字符，保留中文
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[<>:"/\\|?*]/g, "_").trim() || "untitled";
}

export default function Exporter({ markdownContent, filename, disabled }: ExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // 外部点击关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // 导出到 Tauri dialog 选择的路径
  const exportWithDialog = useCallback(async () => {
    if (!markdownContent || !filename) return;
    setIsExporting(true);
    setExported(false);
    setMenuOpen(false);

    try {
      const mdName = sanitizeFilename(filename) + ".md";

      if (isTauriEnvironment()) {
        // Tauri: 弹出保存对话框
        const { save } = await import("@tauri-apps/plugin-dialog");
        const targetPath = await save({
          defaultPath: mdName,
          filters: [
            { name: "Markdown", extensions: ["md"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });

        if (!targetPath) {
          setIsExporting(false);
          return; // 用户取消
        }

        // 写入文件
        await exportMarkdown({
          content: markdownContent,
          path: targetPath.replace(/[/\\][^/\\]+$/, ""), // 目录
          filename: targetPath.split(/[/\\]/).pop() ?? mdName,
        });

        setExportPath(targetPath);
      } else {
        // 浏览器: Blob 下载
        const blob = new Blob([markdownContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = mdName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportPath(mdName);
      }

      // 记录导出历史
      setHistory((prev) => {
        const record: ExportRecord = {
          filename: mdName,
          path: exportPath ?? mdName,
          timestamp: Date.now(),
        };
        return [record, ...prev].slice(0, MAX_HISTORY);
      });

      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch (err) {
      console.error("导出失败:", err);
    } finally {
      setIsExporting(false);
    }
  }, [markdownContent, filename, exportPath]);

  // 快速导出到上次路径
  const quickExport = useCallback(async () => {
    await exportWithDialog();
  }, [exportWithDialog]);

  // 导出到指定文件夹（未来功能）
  const exportToFolder = useCallback(async () => {
    // Tauri: 使用 dialog.open 选择文件夹
    // 目前复用 exportWithDialog
    await exportWithDialog();
  }, [exportWithDialog]);

  // 复制到剪贴板
  const copyToClipboard = useCallback(async () => {
    if (!markdownContent) return;
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(markdownContent);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = markdownContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }
  }, [markdownContent]);

  return (
    <div className="relative" ref={menuRef}>
      {/* 主按钮 + 下拉 */}
      <div className="flex rounded-md overflow-hidden border border-obsidian-border">
        <button
          onClick={quickExport}
          disabled={disabled || isExporting}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs
            transition-all duration-200
            ${
              exported
                ? "bg-obsidian-success/20 text-obsidian-success"
                : "bg-obsidian-accent hover:bg-obsidian-accent-hover text-white"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : exported ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {exported ? "已导出" : "导出"}
        </button>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={disabled || isExporting}
          className="px-1.5 py-1.5 bg-obsidian-accent hover:bg-obsidian-accent-hover text-white/70 hover:text-white transition-colors disabled:opacity-50 border-l border-white/10"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* 下拉菜单 */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-obsidian-surface border border-obsidian-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="py-1">
            <button
              onClick={exportWithDialog}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-obsidian-text hover:bg-obsidian-border/50 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-obsidian-accent" />
              <div className="text-left">
                <p>导出 Markdown 文件</p>
                <p className="text-[10px] text-obsidian-muted">选择保存位置</p>
              </div>
            </button>

            <button
              onClick={exportToFolder}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-obsidian-text hover:bg-obsidian-border/50 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-obsidian-accent" />
              <div className="text-left">
                <p>导出到文件夹</p>
                <p className="text-[10px] text-obsidian-muted">选择目标文件夹</p>
              </div>
            </button>

            <button
              onClick={copyToClipboard}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-obsidian-text hover:bg-obsidian-border/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-obsidian-muted" />
              <div className="text-left">
                <p>复制到剪贴板</p>
                <p className="text-[10px] text-obsidian-muted">直接复制 Markdown 内容</p>
              </div>
            </button>
          </div>

          {/* 导出历史 */}
          {history.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-t border-obsidian-border">
                <div className="flex items-center gap-1 text-[10px] text-obsidian-muted mb-1">
                  <History className="w-3 h-3" />
                  最近导出
                </div>
                {history.map((record, i) => (
                  <div
                    key={record.timestamp}
                    className="flex items-center gap-1.5 text-[10px] text-obsidian-muted py-0.5"
                    title={record.path}
                  >
                    <span className="truncate flex-1">{record.filename}</span>
                    <span className="text-obsidian-border">
                      {new Date(record.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
