# Book2Markdown Desktop

轻量级桌面文档转 Markdown 工具

**Obsidian 风格暗色 UI + Microsoft MarkItDown 引擎**

---

## 功能

- **导入** — 拖放或选择 PDF / EPUB / DOCX / PPTX / XLSX / HTML 等 20+ 格式
- **转换** — 一键转换为 Markdown，查看格式、大小、耗时
- **预览** — Markdown 源码 + 渲染预览，代码语法高亮
- **导出** — 导出 .md 文件、复制到剪贴板、批量导出

---

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript + TailwindCSS |
| 转换引擎 | Python 3.10+ + Microsoft MarkItDown |
| 语法高亮 | One Dark Pro 暗色主题 |

---

## 环境要求

- **Node.js** >= 18
- **Rust** >= 1.70（[rustup.rs](https://rustup.rs)）
- **Python** >= 3.10

**Windows**: Visual Studio Build Tools（或 Windows SDK）
**macOS**: Xcode Command Line Tools（`xcode-select --install`）
**Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential`

---

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USER/book2markdown-desktop.git
cd book2markdown-desktop

# 2. 安装前端依赖
npm install

# 3. 安装 Python 依赖
cd backend
pip install -r requirements.txt
cd ..

# 4. 启动开发模式
npm run tauri dev

# 5. 构建打包
npm run tauri build
```

---

## 项目结构

```
book2markdown-desktop/
├── src-tauri/              # Tauri v2 Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json     # 窗口 / 权限 / 打包配置
│   └── src/
│       ├── main.rs         # Rust 入口
│       └── lib.rs          # Tauri 命令（健康检查/转换/导出）
│
├── src/                    # React 前端
│   ├── App.tsx             # 主布局
│   ├── index.css           # TailwindCSS + 暗色主题 + 语法高亮
│   ├── components/
│   │   ├── Sidebar.tsx     # 文件列表
│   │   ├── FileImporter.tsx# 拖放 + 文件选择导入
│   │   ├── Converter.tsx   # 转换控制 + 状态机
│   │   ├── MarkdownPreview.tsx # 预览 + 代码高亮
│   │   └── Exporter.tsx    # 导出下拉菜单
│   ├── hooks/useConversion.ts  # 转换状态管理
│   ├── types/index.ts      # TypeScript 类型
│   └── utils/tauri-bridge.ts   # Tauri IPC 桥接
│
├── backend/                # Python 转换引擎
│   ├── bridge-protocol.json# 通信协议文档
│   ├── requirements.txt    # markitdown, loguru
│   └── src/
│       ├── converter.py    # MarkItDown 转换核心
│       └── utils.py        # 日志（loguru / stdlib）
│
├── package.json            # Node.js 依赖
├── vite.config.ts          # Vite 构建配置
├── tailwind.config.js      # TailwindCSS 暗色主题
└── tsconfig.json           # TypeScript 配置
```

---

## 打包

| 平台 | 输出 |
|------|------|
| Windows | `.exe` / `.msi` |
| macOS | `.dmg` |
| Linux | `.AppImage` / `.deb` |

打包产物在 `src-tauri/target/release/bundle/`。

---

## 扩展点（预留接口）

- OCR — PDF 图片文字识别
- MinerU — 学术 PDF 高级解析
- OpenAI / Claude — AI 辅助 Markdown 优化
- Local LLM — 本地大模型增强
- Obsidian Vault — 直接导出到 Obsidian 库
- 批量处理 — 多文件并发转换

---

## License

MIT
