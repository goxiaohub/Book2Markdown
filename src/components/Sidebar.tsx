import type { DocumentFile } from "../types";
import { File, X, FolderOpen } from "lucide-react";

interface SidebarProps {
  files: DocumentFile[];
  selectedFile: DocumentFile | null;
  onSelectFile: (file: DocumentFile) => void;
  onRemoveFile: (fileId: string) => void;
}

const EXTENSION_COLORS: Record<string, string> = {
  ".pdf": "text-red-400",
  ".epub": "text-green-400",
  ".docx": "text-blue-400",
  ".pptx": "text-orange-400",
  ".xlsx": "text-emerald-400",
  ".html": "text-yellow-400",
  ".htm": "text-yellow-400",
  ".md": "text-purple-400",
  ".csv": "text-lime-400",
  ".json": "text-cyan-400",
  ".xml": "text-pink-400",
};

function getExtensionColor(ext: string): string {
  return EXTENSION_COLORS[ext.toLowerCase()] ?? "text-obsidian-muted";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Sidebar({
  files,
  selectedFile,
  onSelectFile,
  onRemoveFile,
}: SidebarProps) {
  return (
    <aside className="w-sidebar bg-obsidian-sidebar border-r border-obsidian-border flex flex-col shrink-0">
      {/* 标题 */}
      <div className="h-12 flex items-center px-4 border-b border-obsidian-border">
        <FolderOpen className="w-4 h-4 text-obsidian-muted mr-2" />
        <span className="text-xs font-semibold text-obsidian-muted uppercase tracking-wider">
          文件列表
        </span>
        <span className="ml-auto text-xs text-obsidian-muted">
          {files.length}
        </span>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-obsidian-muted">
            <p>暂无文件</p>
            <p className="mt-1">拖放或导入文件</p>
          </div>
        ) : (
          files.map((file) => (
            <button
              key={file.id}
              onClick={() => onSelectFile(file)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left
                hover:bg-obsidian-border/30 transition-colors duration-100
                group relative
                ${
                  selectedFile?.id === file.id
                    ? "bg-obsidian-accent/10 border-l-2 border-obsidian-accent"
                    : "border-l-2 border-transparent"
                }
              `}
            >
              <File className={`w-4 h-4 shrink-0 ${getExtensionColor(file.extension)}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-obsidian-text truncate font-medium">
                  {file.name}
                </p>
                <p className="text-[10px] text-obsidian-muted">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-obsidian-border transition-all"
                title="移除"
              >
                <X className="w-3 h-3 text-obsidian-muted" />
              </button>
            </button>
          ))
        )}
      </div>

      {/* 底部信息 */}
      <div className="px-3 py-2 border-t border-obsidian-border text-[10px] text-obsidian-muted">
        v0.1.0
      </div>
    </aside>
  );
}
