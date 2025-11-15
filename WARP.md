# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

This project is a Vite + React + TypeScript SPA for AI-assisted mind mapping. The primary package manager is **npm**.

### Install

```bash
npm install
```

### Run dev server

Vite dev server (configured on port `8080`):

```bash
npm run dev
```

Then open `http://localhost:8080`.

### Build

Standard production build:

```bash
npm run build
```

Development-mode build (uses Vite `--mode development`):

```bash
npm run build:dev
```

### Lint

ESLint is configured via `eslint.config.js`. To lint the whole project:

```bash
npm run lint
```

### Preview built app

Serves the built `dist/` bundle locally (run `npm run build` first):

```bash
npm run preview
```

### Docker / containerized run

There is a two-stage Docker image (`docker/Dockerfile`) and a `compose.yaml` for running Nginx:

```bash
# Build and run via Docker Compose
docker compose up --build
```

This serves the app from Nginx on `http://localhost:27080` (mapped to container port `80`).

### Tests

As of now there are **no test scripts** defined in `package.json` and no obvious test configuration files; there is no standard test or single-test command to document.


## Architecture overview

### Tech stack

- **Frontend**: React + TypeScript + Vite
- **Styling/UI**: Tailwind CSS (`tailwind.config.ts`), shadcn/ui components in `src/components/ui`, Lucide icons
- **State management**: Zustand
- **Graph rendering**: ReactFlow (mind map canvas and custom nodes)
- **Notifications**: `sonner` (wrapped in `src/utils/toast.ts`)
- **AI integration**: OpenRouter Chat Completions API (or compatible LLM API)

### Application shell and layout

- The main screen is composed in `src/pages/Index.tsx`.
  - Layout: full-screen flex container with `<Header />` at the top and a flex row for content.
  - Center area: `<MindMapCanvas />` renders the ReactFlow graph.
  - Right: `<Sidebar />` opens when a node is selected for editing.
  - Left: `<ChatSidebar />` can be toggled to show AI chat history and input.
- All of these components read and mutate global state via the shared Zustand store (`src/lib/store.ts`).

### Mind map model and rendering

- Core types live in `src/types/index.ts`:
  - `MindMapNodeData` (title, color, `isRoot`, `question`, `answer`, `memo`).
  - `MindMapNode` / `MindMapEdge` are ReactFlow `Node`/`Edge` wrappers.
- `src/lib/store.ts` holds the central mind-map state and actions:
  - `nodes`, `edges`, `selectedNodeId`, `isChatSidebarOpen`, `chatHistory`.
  - Node graph operations: `addRootNode`, `addChildNode`, `addMultipleChildNodes`, `deleteSelectedNode`, `applyColorToDescendants`, `alignNodes`, `updateSelectedNode`, `updateNodeData`, `loadState`.
  - Chat-related operations: `getContext` (constructs a conversation path from root to a node), `chatAndCreateNode` (LLM-backed creation of a new child node with Q&A and auto-generated title).
- Rendering is handled by `src/components/MindMapCanvas.tsx`:
  - Wraps ReactFlow inside a `ReactFlowProvider` and wires up `onNodesChange`, `onEdgesChange`, `onConnect`, `onEdgeUpdate`, `onNodeClick`, and `onPaneClick` to the Zustand store.
  - Uses custom node types:
    - `root` → `src/components/customNodes/RootNode.tsx`
    - `normal` → `src/components/customNodes/NormalNode.tsx`
  - Enforces domain rules via `isCircularConnection`:
    - Disallows circular dependencies when connecting nodes.
    - Treats orphaned non-root nodes as invalid (failsafe).
- Custom node components (`RootNode`, `NormalNode`) implement inline title editing, enforce non-empty/unique titles across the graph, and visually differentiate root vs normal nodes.

### Node editing and AI workflows

- `src/components/Sidebar.tsx` (right-hand edit panel):
  - Lets the user edit a node's title, color, question, and private memo.
  - Prevents empty titles and duplicates (by checking other nodes before committing a change).
  - Provides AI actions via `fetchLLMResponse` and `SUMMARIZE_PROMPT`:
    - **Execute** (`handleExecute`): sends the node's `question` plus contextual Q/A history (excluding the current node) and stores the returned `answer` on the node.
    - **Summarize**: uses the conversation path (including the current node) to generate a Markdown summary shown in `SummarizeModal`.
    - **Summarize to Title**: converts the node's Q&A into a concise unique title.
    - **Create Associated Nodes**: asks the LLM for 4 related words, parses them as new child node titles, and calls `addMultipleChildNodes`.
- `src/components/ChatSidebar.tsx` (left-hand chat panel):
  - Shows the `chatHistory` derived from `getContext` plus any recent messages for the selected node.
  - Allows the user to send a message; `chatAndCreateNode` then:
    - Builds an LLM prompt from context + user message.
    - Creates a child node whose `question`/`answer` come from the chat and whose title is auto-summarized via another LLM call.
  - Provides a **Refine** action that sends a special prompt to improve the user's pending input text and updates the input field.

### Persistence and file format

- `src/lib/fileUtils.ts` defines how mind maps are serialized to and from Markdown:
  - `serializeMindMap(nodes, edges)` outputs a Markdown document with:
    - A Mermaid `graph TD` block visualizing nodes and edges.
    - A `json` code block containing `{ nodes, edges }`.
  - `deserializeMindMap(markdown)` extracts and parses the `json` code block back into nodes/edges.
- The `<Header />` component (`src/components/Header.tsx`) wires this up:
  - **Save**: `serializeMindMap` → `downloadFile` (client-side download, filename `mindmap-YYYY-MM-DD.md`).
  - **Load**: reads a `.md` file, calls `deserializeMindMap`, and (after user confirmation) passes the result to `loadState`.

### Global UX and notifications

- `src/utils/toast.ts` wraps the `sonner` toast API with helpers `showSuccess`, `showError`, `showLoading`, and `dismissToast`.
- Many store actions and components use these helpers to provide user feedback (e.g., on successful load/save, color application, and LLM errors).


## Environment variables and external services

Environment variables are consumed via `import.meta.env` (Vite) and documented in `README.md` and `src/lib/api.ts`:

- `VITE_OPENROUTER_API_KEY` (required)
  - Used in `src/lib/api.ts` as the bearer token for OpenRouter.
  - If missing or still set to the placeholder `"your_api_key_here"`, `fetchLLMResponse` shows an error and throws, preventing AI calls.
- `VITE_OPENROUTER_MODEL` (optional)
  - Also read in `src/lib/api.ts`.
  - Defaults to `openai/gpt-3.5-turbo` if not provided.
- `VITE_SUMMARIZE_PROMPT` (optional)
  - Read in `src/lib/api.ts` and re-exported as `SUMMARIZE_PROMPT`.
  - Controls the instruction used when summarizing conversation history in the sidebar.

These variables are expected to be set in a `.env` file at the project root (see README). Example from the README:

```bash
VITE_OPENROUTER_API_KEY="your_api_key_here"
VITE_OPENROUTER_MODEL="openai/gpt-3.5-turbo"   # optional
VITE_SUMMARIZE_PROMPT="Please summarize this conversation concisely in Markdown format."  # optional
```

The LLM endpoint is hard-coded in `src/lib/api.ts` as `https://openrouter.ai/api/v1/chat/completions`. Any compatible API must match this interface.


## TypeScript, aliases, and project conventions

### TypeScript configuration and aliases

- `tsconfig.json` uses project references to `tsconfig.app.json` and `tsconfig.node.json`.
- `compilerOptions` include:
  - `baseUrl: "."`
  - `paths: { "@/*": ["./src/*"] }`
  - Several strict flags are disabled (`noImplicitAny`, `noUnusedParameters`, `noUnusedLocals`, `strictNullChecks` all set to `false`), and `skipLibCheck` is `true`.
- Vite (`vite.config.ts`) mirrors the alias:
  - `"@"` → `path.resolve(__dirname, "./src")`.

**Implication for edits:** prefer imports like `@/lib/store`, `@/components/Sidebar`, `@/utils/toast` instead of long relative paths.

### State and ID conventions

- Node IDs are generated via `nanoid` in `src/lib/store.ts` and used consistently for ReactFlow nodes and edges.
- Node titles are enforced to be unique, non-empty strings:
  - Store-level creation (`addRootNode`, `addChildNode`, `addMultipleChildNodes`, `chatAndCreateNode`) ensures new titles do not clash with existing ones (adding numeric suffixes if necessary).
  - Inline editing in `RootNode` / `NormalNode` validates titles and reverts on duplicates.
- Edges are simple parent→child relations; domain logic assumes a tree/forest:
  - `MindMapCanvas` prevents creating cycles and treats orphaned non-root nodes as invalid.
  - `alignNodes` computes subtree heights to lay out trees nicely with configurable `xSpacing`/`ySpacing`.
- Colors:
  - Each node carries a `color` in its `data`.
  - `applyColorToDescendants` recolors all descendants of the selected node and updates the stroke color of corresponding edges.

### Serialization format

- Mind maps are intended to round-trip through Markdown files generated by `serializeMindMap` / `deserializeMindMap`.
- The JSON block is the source of truth; the Mermaid diagram is a human-friendly preview.
- When editing or generating Markdown programmatically, keep this structure intact so the loader continues to work.

### Linting and style

- Linting is handled by ESLint via `eslint.config.js` and the `npm run lint` script.
- Tailwind classes are composed using the `cn` helper (`src/lib/utils.ts`) which wraps `clsx` + `tailwind-merge` to avoid conflicting classes.

This should be enough context for future WARP instances to run the app, understand the main data flow, and make safe, idiomatic changes without re-discovering the architecture from scratch.