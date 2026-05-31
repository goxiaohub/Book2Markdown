import { useCallback, useState } from "react";
import type { DocumentFile } from "../types";
import { SUPPORTED_EXTENSIONS } from "../types";
import { isTauriEnvironment } from "../utils/tauri-bridge";
import { Upload, FilePlus, FileText, FolderOpen, AlertCircle } from "lucide-react";

interface FileImporterProps {
  onFilesAdded: (files: DocumentFile[]) => void;
  hasFiles: boolean;
}

function getExtension(filename: string): string {
  return "." + (filename.split(".").pop()?.toLowerCase() ?? "");
}

async function pickFilesViaDialog(): Promise<DocumentFile[]> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "支持的文件",
          extensions: SUPPORTED_EXTENSIONS.map((e) => e.replace(".", "")),
        },
      ],
    });

    if (!selected) return [];

    const paths: string[] = Array.isArray(selected) ? selected : [selected];
    const entries: DocumentFile[] = [];

    for (const [i, path] of paths.entries()) {
      const name = path.split(/[/\\]/).pop() ?? path;
      const ext = getExtension(name);
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        // 通过 Tauri fs plugin 获取文件大小
        let size = 0;
        try {
          const { stat } = await import("@tauri-apps/plugin-fs");
          const info = await stat(path);
          size = info.size;
        } catch {
          // size 获取失败时使用 0
        }
        entries.push({
          id: `${Date.now()}-${i}-${name}`,
          name,
          path,
          extension: ext,
          size,
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export default function FileImporter({ onFilesAdded, hasFiles }: FileImporterProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);

  const processFileEntries = useCallback(
    (entries: DocumentFile[]) => {
      if (entries.length === 0) return;
      onFilesAdded(entries);
    },
    [onFilesAdded]
  );

  const processFileList = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const entries: DocumentFile[] = [];
      let skipped = 0;
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const ext = getExtension(f.name);
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          entries.push({
            id: `${Date.now()}-${i}-${f.name}`,
            name: f.name,
            path: (f as any).path ?? f.name,
            extension: ext,
            size: f.size,
          });
        } else {
          skipped++;
        }
      }
      setSkippedCount(skipped);
      if (entries.length > 0) {
        onFilesAdded(entries);
      }
    },
    [onFilesAdded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      processFileList(e.dataTransfer.files);
    },
    [processFileList]
  );

  const handleClick = useCallback(async () => {
    if (isTauriEnvironment()) {
      setIsPicking(true);
      try {
        const entries = await pickFilesViaDialog();
        if (entries.length > 0) {
          onFilesAdded(entries);
        }
      } finally {
        setIsPicking(false);
      }
    }
  }, [onFilesAdded]);

  const handleNativeFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFileList(e.target.files);
    },
    [processFileList]
  );

  return (
    <div
      className="flex-1 flex items-center justify-center p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        onClick={handleClick}
        className={`
          w-full max-w-lg border-2 border-dashed rounded-2xl p-12
          flex flex-col items-center justify-center gap-4
          transition-all duration-200
          ${isTauriEnvironment() ? "cursor-pointer" : ""}
          ${
            isDragOver
              ? "border-obsidian-accent bg-obsidian-accent/5 scale-[1.02]"
              : "border-obsidian-border hover:border-obsidian-muted hover:bg-obsidian-surface/50"
          }
        `}
      >
        <div
          className={`p-4 rounded-full transition-all duration-200 ${
            isDragOver || isPicking
              ? "bg-obsidian-accent/10"
              : "bg-obsidian-surface"
          }`}
        >
          {isDragOver ? (
            <FilePlus className="w-10 h-10 text-obsidian-accent" />
          ) : isPicking ? (
            <FolderOpen className="w-10 h-10 text-obsidian-accent animate-pulse" />
          ) : (
            <Upload className="w-10 h-10 text-obsidian-muted" />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-obsidian-text mb-1">
            {isDragOver
              ? "释放以导入文件"
              : isPicking
              ? "正在打开文件选择器..."
              : isTauriEnvironment()
              ? "点击选择文件或拖放到此处"
              : "拖放文件到此处"}
          </p>
          <p className="text-xs text-obsidian-muted">
            PDF · EPUB · DOCX · PPTX · XLSX · HTML 等 20+ 格式
          </p>
        </div>

        {/* 浏览器回退：隐藏的 native file input */}
        {!isTauriEnvironment() && (
          <input
            type="file"
            multiple
            className="hidden"
            id="native-file-input"
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={handleNativeFileChange}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* 跳过文件提示 */}
      {skippedCount > 0 && (
        <div className="absolute bottom-24 flex items-center gap-2 px-3 py-1.5 bg-obsidian-warning/10 border border-obsidian-warning/30 rounded-lg text-xs text-obsidian-warning animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{skippedCount} 个文件格式不支持，已跳过</span>
        </div>
      )}

      {!hasFiles && (
        <div className="absolute bottom-8 flex items-center gap-2 text-xs text-obsidian-muted">
          <FileText className="w-3.5 h-3.5" />
          <span>基于 Microsoft MarkItDown 引擎</span>
        </div>
      )}
    </div>
  );
}
