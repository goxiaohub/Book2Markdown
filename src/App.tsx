import { useConversion } from "./hooks/useConversion";
import Sidebar from "./components/Sidebar";
import FileImporter from "./components/FileImporter";
import Converter from "./components/Converter";
import MarkdownPreview from "./components/MarkdownPreview";
import Exporter from "./components/Exporter";
import { FileText, Wifi, WifiOff, Monitor } from "lucide-react";

export default function App() {
  const {
    files,
    selectedFile,
    markdownContent,
    isConverting,
    conversionError,
    conversionMetadata,
    activeView,
    backendReady,
    isTauri,
    addFiles,
    selectFile,
    convertFile,
    clearSelection,
    removeFile,
    setActiveView,
  } = useConversion();

  return (
    <div className="flex h-full">
      {/* 左侧边栏 */}
      <Sidebar
        files={files}
        selectedFile={selectedFile}
        onSelectFile={selectFile}
        onRemoveFile={removeFile}
      />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-obsidian-border bg-obsidian-surface shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-obsidian-accent" />
            <span className="text-sm font-semibold text-obsidian-text tracking-wide">
              Book2Markdown
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* 后端状态指示器 */}
            <div
              className="flex items-center gap-1.5 text-[10px] text-obsidian-muted"
              title={
                isTauri
                  ? backendReady
                    ? "Python/MarkItDown 后端就绪"
                    : "Python 后端不可用 — 请检查 numpy, markitdown 是否安装"
                  : "浏览器开发模式 — 使用 mock 数据"
              }
            >
              {isTauri ? (
                backendReady ? (
                  <Wifi className="w-3 h-3 text-obsidian-success" />
                ) : (
                  <WifiOff className="w-3 h-3 text-obsidian-warning" />
                )
              ) : (
                <Monitor className="w-3 h-3 text-obsidian-muted" />
              )}
              <span className="hidden sm:inline">
                {isTauri
                  ? backendReady
                    ? "后端就绪"
                    : "后端离线"
                  : "开发模式"}
              </span>
            </div>

            <Exporter
              markdownContent={markdownContent}
              filename={selectedFile?.name}
              disabled={!markdownContent}
            />
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedFile ? (
            <FileImporter
              onFilesAdded={addFiles}
              hasFiles={files.length > 0}
            />
          ) : (
            <Converter
              file={selectedFile}
              markdownContent={markdownContent}
              isConverting={isConverting}
              conversionError={conversionError}
              activeView={activeView}
              metadata={conversionMetadata}
              onConvert={() => convertFile(selectedFile)}
              onClear={clearSelection}
              onViewChange={setActiveView}
            >
              <MarkdownPreview
                content={markdownContent}
                activeView={activeView}
              />
            </Converter>
          )}
        </div>
      </main>
    </div>
  );
}
