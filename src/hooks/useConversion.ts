import { useState, useCallback, useEffect } from "react";
import {
  healthCheck,
  convertDocument,
  isTauriEnvironment,
  mockConvertDocument,
} from "../utils/tauri-bridge";
import type {
  DocumentFile,
  ConversionResult,
  ConversionMetadata,
  ViewMode,
} from "../types";

export function useConversion() {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionMetadata, setConversionMetadata] =
    useState<ConversionMetadata | undefined>();
  const [activeView, setActiveView] = useState<ViewMode>("preview");
  const [backendReady, setBackendReady] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  // 启动时检测环境
  useEffect(() => {
    const tauri = isTauriEnvironment();
    setIsTauri(tauri);

    if (tauri) {
      healthCheck()
        .then((result) => setBackendReady(result.available))
        .catch(() => setBackendReady(false));
    }
  }, []);

  const addFiles = useCallback((newFiles: DocumentFile[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const toAdd = newFiles.filter((f) => !existing.has(f.path));
      return [...prev, ...toAdd];
    });
  }, []);

  const selectFile = useCallback((file: DocumentFile) => {
    setSelectedFile(file);
    setConversionError(null);
    // 不自动清除已有的转换结果，允许用户切换文件后回来
  }, []);

  const convertFile = useCallback(
    async (file: DocumentFile) => {
      setIsConverting(true);
      setConversionError(null);
      setConversionMetadata(undefined);

      try {
        let result: ConversionResult;

        if (isTauri) {
          result = await convertDocument(file.path);
        } else {
          // 浏览器开发模式：mock 转换，模拟延迟
          await new Promise((r) => setTimeout(r, 800));
          result = await mockConvertDocument(file.path, file.name);
        }

        if (result.success) {
          setMarkdownContent(result.markdown);
          setConversionMetadata(result.metadata);
          setActiveView("preview"); // 默认显示预览
        } else {
          setConversionError(result.error ?? "未知转换错误");
          setMarkdownContent("");
          setConversionMetadata(undefined);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "转换失败";
        setConversionError(message);
        setMarkdownContent("");
        setConversionMetadata(undefined);
      } finally {
        setIsConverting(false);
      }
    },
    [isTauri]
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setMarkdownContent("");
    setConversionError(null);
    setConversionMetadata(undefined);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setSelectedFile((prev) => (prev?.id === fileId ? null : prev));
    // 如果删除的是当前选中的文件，清除相关内容
    setMarkdownContent((prev) => {
      const stillSelected = fileId === selectedFile?.id;
      return stillSelected ? "" : prev;
    });
    setConversionError((prev) => {
      const stillSelected = fileId === selectedFile?.id;
      return stillSelected ? null : prev;
    });
    setConversionMetadata((prev) => {
      const stillSelected = fileId === selectedFile?.id;
      return stillSelected ? undefined : prev;
    });
  }, [selectedFile?.id]);

  return {
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
  };
}
