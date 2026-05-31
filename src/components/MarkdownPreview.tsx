import { useState, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ViewMode } from "../types";
import { Copy, Check, ArrowUp, Maximize2, Minimize2 } from "lucide-react";

// ---- 代码块组件 ----

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  // 应用 highlight.js 类名（手工分词模拟）
  const highlightedCode = useMemo(() => {
    // 简易关键字高亮（作为 CSS hljs 类名方案的补充）
    return code;
  }, [code]);

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || "text"}</span>
        <button
          className={`code-block-copy ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title={copied ? "已复制" : "复制代码"}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              复制
            </>
          )}
        </button>
      </div>
      <div className="code-block-body">
        <pre>
          <code className={language ? `language-${language}` : ""}>
            {highlightedCode}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ---- 内联代码组件 ----

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="inline-code">
      {children}
    </code>
  );
}

// ---- 统计计算 ----

interface PreviewStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
  readTimeMin: number;
}

function computeStats(content: string): PreviewStats {
  const lines = content.split("\n");
  const charCount = content.length;
  const wordCount = content
    .replace(/[#*`>\[\]()!_~|\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  // 中文阅读速度约 400 字/分钟，英文约 200 词/分钟
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return {
    wordCount,
    charCount,
    lineCount: lines.length,
    readTimeMin,
  };
}

// ---- 主组件 ----

interface MarkdownPreviewProps {
  content: string;
  activeView: ViewMode;
}

export default function MarkdownPreview({ content, activeView }: MarkdownPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stats = useMemo(() => computeStats(content), [content]);

  if (!content) return null;

  // 源码视图
  if (activeView === "markdown") {
    return (
      <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50 bg-obsidian-bg" : ""}`}>
        <div className="preview-stats shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <span>行 {stats.lineCount.toLocaleString()}</span>
            <span>字符 {stats.charCount.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 text-obsidian-muted hover:text-obsidian-text transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="text-sm text-obsidian-text font-mono whitespace-pre-wrap leading-relaxed p-4">
            {content}
          </pre>
        </div>
      </div>
    );
  }

  // 渲染预览视图
  return (
    <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50 bg-obsidian-bg" : ""}`}>
      {/* 统计栏 */}
      <div className="preview-stats shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <span>词 {stats.wordCount.toLocaleString()}</span>
          <span>字符 {stats.charCount.toLocaleString()}</span>
          <span>约 {stats.readTimeMin} 分钟阅读</span>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center gap-1 text-obsidian-muted hover:text-obsidian-text transition-colors"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3 h-3" />
          ) : (
            <Maximize2 className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* 渲染内容 */}
      <div className="flex-1 overflow-auto">
        <div className="markdown-preview">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 代码块
              pre({ children, ...props }) {
                return <>{children}</>;
              },
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isBlock = match || String(children).includes("\n");

                if (isBlock) {
                  const lang = match ? match[1] : "";
                  const codeStr = String(children).replace(/\n$/, "");
                  return (
                    <CodeBlock
                      language={lang}
                      code={codeStr}
                    />
                  );
                }

                return (
                  <InlineCode>
                    {children}
                  </InlineCode>
                );
              },
              // 图片增强
              img({ src, alt, ...props }) {
                return (
                  <img
                    src={src}
                    alt={alt ?? ""}
                    loading="lazy"
                    className="max-w-full rounded-lg my-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                    {...props}
                  />
                );
              },
              // 表格增强
              table({ children, ...props }) {
                return (
                  <div className="overflow-x-auto mb-4">
                    <table {...props}>{children}</table>
                  </div>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* 浮动工具栏 */}
      {!isFullscreen && content.length > 500 && (
        <div className="floating-toolbar">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            title="回到顶部"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            title="全屏"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
