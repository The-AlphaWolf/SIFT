# SIFT — Intelligent Local File Librarian 🔍📁

> **A privacy-first, lightning-fast desktop file librarian powered by local vector search and adaptive AI.**
> Index, organize, deduplicate, and semantically search your entire document library without cloud subscriptions or telemetry.

---

## ✨ Features

- 🧠 **Hybrid Search Engine**: Combines SQLite FTS5 full-text search with `sqlite-vec` vector embeddings and semantic intent expansion. Search by exact keyword or natural phrasing (e.g. *"study materials"*, *"tax returns"*, *"project contracts"*).
- 🔒 **100% Privacy & Local-First**: Your documents, embeddings, and library index never leave your machine.
- ⚡ **Dynamic Hardware Detection**: Automatically profiles host CPU, GPU (NVIDIA, AMD Radeon, Intel Arc), RAM, and OS to optimize worker batch sizes and memory usage.
- 🤖 **Flexible AI Inference Providers**:
  - **Local & Offline**: Native support for **Ollama** and **LM Studio** (Qwen 2.5, Llama 3.2, Mistral).
  - **BYO Cloud API Keys**: Optional support for **OpenAI** (`gpt-4o`, `gpt-4o-mini`), **Google Gemini** (`gemini-1.5-flash`), or any **OpenAI-Compatible Custom Endpoint**.
- 📂 **Multi-Directory Background Indexing**: Recursive indexing with real-time filesystem watchers.
- 👯 **Deduplication Engine**: Identifies exact duplicates via SHA-256 and perceptual content matching.
- 🗂️ **Automated Organization**: Proposes intelligent category folder structures based on file topics and metadata.
- 📦 **Zero-Install Portable Executable**: Runs as a single standalone `.exe` without requiring admin rights, or as a full Windows installer.

---

## 🚀 Download & Installation

Visit the [Releases](https://github.com/The-AlphaWolf/SIFT/releases) page to download the latest Windows build:

| Download Asset | Type | Description |
| :--- | :--- | :--- |
| **`SIFT-1.0.0-Portable.exe`** | **Standalone Executable** | **No installation required.** Download, double-click, and run anywhere (e.g. USB drive or Downloads folder). |
| **`SIFT-Setup-1.0.0.exe`** | **Windows Installer** | Standard installer that creates Desktop shortcuts, Start Menu entry, and an uninstaller in Windows Settings. |

---

## 🛠️ Tech Stack & Architecture

- **Shell & Runtime**: [Electron 33](https://www.electronjs.org/) + Node.js 20
- **Frontend**: [React 18](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) with WAL mode & FTS5
- **Vector Search**: [sqlite-vec](https://github.com/asg017/sqlite-vec) 384-dimensional dense vector embeddings
- **File Parsing & Extraction**: `pdf-parse`, `mammoth` (DOCX), `xlsx`, native plain text / Markdown parsers
- **Build & Packaging**: `electron-builder` (NSIS + Portable Windows targets)

---

## 💻 Developer Setup & Running from Source

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- Windows 10/11 (for native Windows filesystem watchers and hardware detection)

### 1. Clone the repository
```bash
git clone https://github.com/The-AlphaWolf/SIFT.git
cd SIFT
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm run dev
```

### 4. Run Test Suite & Typecheck
```bash
npm test
npm run typecheck
```

### 5. Build Standalone & Installer Executables
```bash
npm run dist
```
Compiled executables will be generated in the `dist/` directory.

---

## ⚙️ AI Configuration

SIFT works out of the box with or without an active AI server:
- **Offline / Local (Default)**: Launch [LM Studio](https://lmstudio.ai/) (local server on port `1234`) or [Ollama](https://ollama.com/) (port `11434`). SIFT automatically connects and detects your active model.
- **Cloud API Keys (Optional)**: In **Settings > Active inference provider**, select OpenAI or Gemini, enter your API key, and test connectivity. Keys are stored locally in your encrypted SQLite application database.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
