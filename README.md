# Recurl

A simple, fast, and local-first HTTP client desktop application (Postman clone) built with Tauri, React, and Rust.

## Features

- **Workspaces & Collections:** Organize your API requests logically in a nested folder-like structure.
- **Tabbed Request Editor:** Edit and view multiple HTTP requests in parallel with unsaved changes tracking.
- **Native Request Execution:** Fast and reliable HTTP requests sent directly from the Rust backend bypassing typical browser CORS restrictions.
- **Local-First Storage:** All your data (workspaces, collections, requests, and UI state) is stored securely and completely locally as JSON files. No cloud sync, no accounts required.
- **AI Chat Panel:** Built-in side panel to assist you with API crafting and reasoning.
- **Resizable Interface:** Fully adjustable split-pane architecture (Sidebar, Editor, AI Panel) with state persistence.
- **Keyboard Shortcuts:** Quick shortcuts (e.g. `Ctrl+N` for new requests, `Ctrl+S` to save, `Ctrl+W` to close tab) for rapid development.

## Architecture & How It Works

Recurl is built on a dual architecture leveraging a web frontend inside a lightweight native OS window through [Tauri](https://tauri.app/).

### Frontend (User Interface)

- Located in the `src/` directory.
- Built using **React**, **TypeScript**, **Vite**, and **TailwindCSS**.
- Handles complex UI states (active tabs, dirty/unsaved states) and routes user interactions as commands to the backend via Tauri's IPC mechanism (`invoke`).

### Backend (Core Logic)

- Located in the `src-tauri/` directory.
- Built statically using **Rust**.
- **HTTP Client (`http_client.rs`):** Receives request payloads from the frontend and securely executes them using the Rust `reqwest` crate. It passes standard HTTP contexts and records precise timings securely.
- **Local Persistence (`workspace.rs`):** Acts as the primary database handler. It uses the host OS's application data directory to maintain isolated JSON files:
  - `state.json`: Maintains a list of available workspaces.
  - `workspaces/<id>/data.json`: Stores all the specific collections, requests, and even UI Tab states per workspace ensuring a seamless return to work on restarts.

## Project Structure

```text
recurl/
├── src/                      # Frontend web application
│   ├── components/           # React UI Components (Sidebar, RequestEditor, ConfigDialog)
│   ├── hooks/                # React Hooks (e.g., useResizable)
│   ├── types.ts              # Global TypeScript interfaces referencing the Rust schemas
│   ├── App.tsx               # Orchestration, local state routing and shortcuts binding
│   └── index.css             # Tailwind imports and root variables
└── src-tauri/                # Backend Rust binary wrapper
    ├── src/
    │   ├── lib.rs            # Application builder and Tauri IPC command registry
    │   ├── http_client.rs    # Core native logic to send off HTTP requests bridging `reqwest`
    │   └── workspace.rs      # Abstractions for File I/O persisting JSON structured databases
    ├── tauri.conf.json       # App metadata, bundle details, OS window configurations
    └── Cargo.toml            # Rust module dependencies manager
```

## Getting Started

### Prerequisites

1. [Node.js](https://nodejs.org/) (v16+)
2. [Rust / Cargo](https://www.rust-lang.org/)
3. [Tauri CLI system prerequisites](https://v2.tauri.app/start/prerequisites/)

### Running Locally

To run the desktop application locally with hot-reloading:

```bash
# Install frontend dependencies
npm install

# Start the application in development mode
npm run tauri dev
```

### Building for Production

To package the app into a release native executable for your system (`.deb`, `.AppImage`, `.exe`, or `.dmg`):

```bash
npm run tauri build
```
