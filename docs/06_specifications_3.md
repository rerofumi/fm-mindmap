# マインドマップアプリ仕様書 v3

本文書は、`04_specifications_2.md` からの機能強化を実装した最新版の仕様書です。  
`05_upgrade_plan_1.md` で提案された4つの改善項目を実装し、より柔軟で高機能なマインドマップアプリケーションとなりました。

最終更新日: 2025年11月16日

---

## 1. 詳細仕様

### 1.1. コア機能

- **マインドマップ描画エンジン**:
  - Webベースのインタラクティブなグラフ描画ライブラリ（React Flow 11.11.4）を利用する。
  - ノードとエッジ（連結線）をキャンバス上にレンダリングする。
  - ノードのドラッグ＆ドロップによる移動、キャンバスのドラッグによるスクロール（パン）、およびズームに対応する。

- **ビューモード切替**:
  - **マップモード**: 従来のマインドマップ中心のインターフェース
  - **チャットモード**: AIとの対話を中心とした新しいインターフェース
  - ヘッダーのタブボタンで自由に切り替え可能

- **データ構造**:
  - アプリケーションの状態はZustandで一元管理する。
  - **ノードオブジェクト** (`MindMapNodeData`)、**ノード** (`MindMapNode`)、**エッジ** (`MindMapEdge`) は従来通り。
  - **ビューモード** (`ViewMode`): 'mindmap' | 'chat' の2種類
  - **選択モデル** (`selectedModel`): 現在使用中のLLMモデル名を保持
  - **スタンドアローンチャット履歴** (`standaloneChatHistory`): チャットモード専用の会話履歴

- **UIコンポーネント**:
  - **ヘッダー** (`Header.tsx`): ビューモード切替タブ、LLMモデル選択ドロップダウン、テキストから作成ボタンを配置。
  - **マインドマップキャンバス** (`MindMapCanvas.tsx`): マインドマップを描画するメインエリア（マップモード時）。
  - **チャットビュー** (`ChatView.tsx`): スタンドアローンチャットインターフェース（チャットモード時）。
  - **詳細情報サイドバー** (`Sidebar.tsx`): 選択されたノードの詳細情報を表示・編集。
  - **チャットサイドバー** (`ChatSidebar.tsx`): マップモード時に選択ノードのチャット履歴を表示。
  - **ツールバー** (`Toolbar.tsx`): マップモード時のノード操作ボタン群（マップキャンバス横に配置）。
  - **サマライズモーダル** (`SummarizeModal.tsx`): サマライズ結果をMarkdown形式で表示。
  - **テキストからマインドマップ作成モーダル** (`TextToMindmapModal.tsx`): テキスト入力からマインドマップを自動生成。
  - **カスタムノード**:
    - **ルートノード** (`RootNode.tsx`): 角丸四角形で表示。ノード自体をダブルクリックして編集可能。
    - **通常ノード** (`NormalNode.tsx`): 四角形で表示。ノード自体をダブルクリックして編集可能。

### 1.2. ノード操作

- **作成**:
  - ツールバーの「ルートノード作成」ボタンで、`isRoot: true` のノードをキャンバスに追加する。
    - デフォルトタイトル: 'Root Node'、色: '#ff6b6b'
    - 重複時は 'Root Node (2)', 'Root Node (3)'... と自動採番
  - ツールバーの「新規ノード作成」ボタンで、現在選択中のノードの子ノードを作成する。親が選択されていない場合は何もしない。
    - デフォルトタイトル: 'New Node'、色: 親ノードの色を継承
    - 重複時は 'New Node (2)', 'New Node (3)'... と自動採番
  - **連想ノード生成（コンテキスト対応）**: サイドバーの「Create Associated Nodes」ボタンで、選択ノードのタイトルと**親ノードからの対話履歴（コンテキスト）**から連想される関連性の高い4つの子ノードを自動生成する（日本語）。
    - `createAssociationPromptWithContext` 関数を使用し、対話の文脈を考慮した示唆に富むキーワードを提案
    - 対話の文脈がない場合はタイトルのみから連想

- **編集**:
  - サイドバーのフォームを通じて、ノードのタイトル、LLMへの質問、色、メモを編集・更新できる。
  - **ノード内直接編集**: ノード自体をダブルクリックして、タイトルを直接編集できる（Enterで確定、Escapeでキャンセル）。
  - **タイトル自動生成**: サイドバーの「Summarize to Title」ボタンで、質問と回答からLLMが自動的に適切なタイトル（10-15文字程度）を生成する。

- **削除**:
  - ツールバーの「ノード削除」ボタンで、選択中のノード（およびその全子孫ノード）を削除する。
  - 再帰的に子孫を検索して一括削除する。

- **親子関係変更**:
  - ドラッグ＆ドロップ操作でノードを別のノードの上に重ねることで、親を変更できる。
  - 循環参照を自動検出し、警告メッセージで防止する。

- **レイアウト**:
  - **ノード整列**: ツールバーの「Align Nodes」ボタンで、木構造に基づいてノードを自動的に整列配置する。
    - 水平間隔: 250px、垂直間隔: 100px
    - サブツリーの高さを計算し、バランスよく配置
  - **色適用**: サイドバーの「Apply Color to Children」ボタンで、選択ノードの色を全ての子孫ノードに適用する（幅優先探索）。

### 1.3. LLM連携

- **APIクライアント** (`lib/api.ts`):
  - OpenRouter のAPIと通信を行うクライアントモジュールを実装する。
  - APIキーと使用モデルは `.env` ファイルに定義し、アプリケーションから読み込む。
    - `VITE_OPENROUTER_API_KEY`: OpenRouter APIキー（必須）
    - `VITE_OPENROUTER_MODEL`: デフォルト使用モデル（オプション、未指定時は `defaultModel` を使用）
  - `fetchLLMResponse(messages: Message[], model?: string): Promise<string>` 関数でAPI呼び出しを行う。
    - `model` パラメータでモデルを動的に指定可能（未指定時は状態管理の `selectedModel` または環境変数を使用）

- **モデル選択機能** (`lib/modelConfig.ts`):
  - 利用可能なLLMモデルのリストを `availableModels` 配列で管理
  - デフォルトモデル: `openai/gpt-5-mini`
  - ヘッダーのドロップダウンメニューからリアルタイムで切り替え可能
  - 設定されたモデルは全てのLLM API呼び出しで使用される
  - 現在利用可能なモデル:
    - GPT-5 Mini / GPT-5.1 Chat / GPT-OSS 120b
    - Qwen3 Next (reasoning / instruct)
    - Claude Haiku 4.5 / Claude Sonnet 4.5
    - Gemini 2.5 Pro

- **プロンプト管理** (`lib/prompts.ts`):
  - アプリケーション全体で使用するプロンプトを一箇所で管理
  - システムプロンプト、テンプレート関数などを定義
  - コンテキスト対応の連想ワード生成プロンプト (`ASSOCIATION_WITH_CONTEXT_PROMPT_TEMPLATE`) を実装

- **コンテキスト構築** (`getContext`):
  - LLMに質問を送信する際、選択中のノードから親をたどり、ルートノードまでの経路に含まれる全ノードの「質問」と「回答」を収集する。
  - 収集したQ&Aを `ChatMessage[]` 型の形式に整形し、APIリクエストの会話履歴（コンテキスト）として使用する。
  - `getContext(nodeId, includeCurrentNode?)` でコンテキストを取得可能。

- **実行と表示**:
  - サイドバーの「Execute」ボタンで、構築したコンテキストと共に「質問」をAPIに送信する。
  - APIからのレスポンスを「回答」としてノードデータに保存し、サイドバーに表示する。
  - ローディング中はボタンにスピナーアイコンを表示。

- **チャット機能** (`chatAndCreateNode`):
  - チャットサイドバーで、選択ノードのチャット履歴をリアルタイムで表示する。
  - 質問を入力して送信すると、以下の処理を自動実行:
    1. ユーザーメッセージをチャット履歴に追加
    2. コンテキストを構築してLLMに送信（選択されたモデルを使用）
    3. LLM回答をチャット履歴に追加
    4. 新しい子ノードを自動生成（質問・回答を含む）
    5. 質問と回答からタイトルを自動生成（LLMによる要約）
    6. 新しいノードを選択状態にする
  - **メッセージ改良機能**: ChatSidebar内で、送信前にLLMがユーザーの入力を校正・明確化する。

- **サマライズ**:
  - サイドバーの「Summarize」ボタンで、現在のコンテキスト（会話履歴）の要約をLLMにリクエストする。
  - 結果をMarkdown形式でモーダルダイアログに表示する（react-markdown + remark-gfm使用）。

### 1.4. スタンドアローンチャットモード（新機能）

- **概要**:
  - マインドマップを介さず、直接AIとの対話を開始できる「チャットモード」を実装。
  - ヘッダーの「Chat mode」タブをクリックして切り替え可能。

- **機能** (`ChatView.tsx`):
  - アプリ起動後、即座にチャットを開始可能（ノード作成不要）。
  - ユーザーとアシスタントのメッセージをアバター付きで表示。
  - スクロール可能なメッセージエリア（自動的に最新メッセージまでスクロール）。
  - 「Scroll to bottom」ボタンで最新メッセージへ素早く移動。
  - **メッセージ改良機能**: 入力欄横の「魔法の杖」ボタンで、LLMが入力テキストを自動校正・明確化。
  - **New Chat ボタン**: チャット履歴をクリアして新しい会話を開始。
  - **Generate Mindmap ボタン**: 現在の会話履歴からマインドマップを自動生成し、マップモードに切り替え。

- **マインドマップ生成** (`generateMindmapFromStandaloneChat`):
  - チャット履歴をLLMに送信し、会話内容から主要トピックと関連性を抽出。
  - JSON形式でノードとエッジの構造を生成。
  - 自動的にノードを配置し、整列機能を実行。
  - 生成後、自動的にマップモードに切り替え。

### 1.5. テキストからマインドマップ自動生成（新機能）

- **概要**:
  - 既存の文章やドキュメントからマインドマップを生成する機能を実装。
  - ヘッダーの「テキストから作成」ボタンからアクセス。

- **機能** (`TextToMindmapModal.tsx`):
  - テキストエリアに任意の文章を入力（記事、レポート、議事録など）。
  - LLMが内容を解析し、主要なトピックと関連性を抽出。
  - 階層構造を持つマインドマップを自動生成（3-5レベル推奨）。
  - 各メインブランチに異なる色を自動的に割り当て。
  - 入力が日本語の場合、日本語のタイトルを生成。

- **マインドマップ生成** (`generateMindmapFromTextInput`):
  - `TEXT_TO_MINDMAP_SYSTEM_PROMPT` と `TEXT_TO_MINDMAP_INSTRUCTION` プロンプトを使用。
  - LLMに詳細な指示（ルートノード数、階層深度、タイトル長、色分けなど）を送信。
  - JSON形式でマインドマップ構造を取得し、ノードとエッジを生成。
  - 自動整列後、マップモードに切り替え。

### 1.6. データ永続化

- **保存・読み込み** (`lib/fileUtils.ts`):
  - 現在のマインドマップの状態（全ノードのデータ）を、Markdown + JSON形式でローカルファイルにエクスポート・インポートできる。
  - エクスポートファイルには、Mermaid図によるプレビューと、JSONデータが含まれる。
  - **エクスポート** (`exportToMarkdown`):
    - ファイル名: `mindmap_YYYYMMDD_HHMMSS.md`
    - ブラウザのダウンロード機能を使用してファイルをダウンロード
  - **インポート** (`importFromMarkdown`):
    - ファイル選択ダイアログから.mdファイルを読み込み
    - Markdownから```json...```ブロックを抽出してパース
    - 確認ダイアログで既存データの上書きを確認

---

## 2. 実装済み機能一覧

### 2.1. 基本機能（v2からの継続）

✅ 環境構築 & プロジェクトセットアップ  
✅ UIコンポーネント実装  
✅ マインドマップ基本機能（CRUD、ドラッグ、パン、ズーム）  
✅ ノード内直接編集（ダブルクリック編集）  
✅ 親子関係編集機能（ドラッグ＆ドロップ、循環参照検出）  
✅ LLM連携機能（質問・回答、コンテキスト構築）  
✅ データ永続化（Markdown + JSON形式）  
✅ ノード整列機能  
✅ 色適用機能  
✅ タイトル自動生成  
✅ サマライズ機能  
✅ チャット機能（チャットサイドバー、自動子ノード生成）  
✅ メモ機能  

### 2.2. v3で追加された新機能（`05_upgrade_plan_1.md` 対応）

✅ **チャット中心UIモードの追加**（改善項目1）
  - スタンドアローンチャットモード (`ChatView.tsx`)
  - ビューモード切替タブ（Map mode / Chat mode）
  - チャット履歴からマインドマップ自動生成
  - メッセージ改良機能（テキスト校正）

✅ **AIによる連想ワード提案の高度化**（改善項目2）
  - コンテキスト対応の連想ワード生成 (`createAssociationPromptWithContext`)
  - 親ノードからの対話履歴全体を考慮した提案
  - 文脈に即した示唆に富むキーワードの生成

✅ **LLMモデル選択機能の追加**（改善項目3）
  - ヘッダーにモデル選択ドロップダウン実装
  - 8種類のLLMモデルをサポート（GPT-5, Qwen3, Claude, Gemini等）
  - リアルタイムでモデル切り替え可能
  - 全てのLLM API呼び出しで選択モデルを使用
  - モデル設定の一元管理 (`lib/modelConfig.ts`)

✅ **テキストからのマインドマップ自動生成機能**（改善項目4）
  - テキスト入力用モーダル (`TextToMindmapModal.tsx`)
  - LLMによる文章解析とマインドマップ構造生成
  - 階層構造の自動構築（3-5レベル推奨）
  - 色分けの自動割り当て
  - 日本語テキスト対応

---

## 3. 技術スタック

### 3.1. フロントエンド

- **フレームワーク**: React 18.3.1 + TypeScript
- **ビルドツール**: Vite 6.3.4
- **スタイリング**: Tailwind CSS + shadcn/ui (Radix UI)
- **グラフ描画**: React Flow 11.11.4
- **状態管理**: Zustand 5.0.6
- **フォーム**: React Hook Form + Zod
- **Markdown**: React Markdown + remark-gfm
- **アイコン**: Lucide React
- **ID生成**: nanoid

### 3.2. LLM連携

- **API**: OpenRouter (https://openrouter.ai/api/v1/chat/completions)
- **対応モデル**:
  - OpenAI: GPT-5 Mini, GPT-5.1 Chat, GPT-OSS 120b
  - Qwen: Qwen3 Next (reasoning/instruct)
  - Anthropic: Claude Haiku 4.5, Claude Sonnet 4.5
  - Google: Gemini 2.5 Pro
- **環境変数**:
  - `VITE_OPENROUTER_API_KEY`: OpenRouter APIキー（必須）
  - `VITE_OPENROUTER_MODEL`: デフォルト使用モデル（オプション、未指定時は `openai/gpt-5-mini`）
- **エラーハンドリング**: API通信エラー時はtoast通知でユーザーに通知

### 3.3. 開発ツール

- **Lint**: ESLint 9.9.0
- **パッケージマネージャー**: pnpm 10.9.0

---

## 4. ファイル構成

```
src/
├── components/
│   ├── ui/                     # shadcn/ui コンポーネント（各種UIプリミティブ）
│   ├── ChatSidebar.tsx         # マップモード用チャットサイドバー
│   ├── ChatView.tsx            # スタンドアローンチャットモード画面（新規）
│   ├── Header.tsx              # ヘッダー（ビューモード切替、モデル選択、テキストから作成）
│   ├── MindMapCanvas.tsx       # マインドマップキャンバス（React Flow統合、D&D、循環参照検出）
│   ├── Sidebar.tsx             # ノード編集用サイドバー（タイトル、色、質問、回答、メモ、各種ボタン）
│   ├── SummarizeModal.tsx      # サマライズモーダル（Markdown表示）
│   ├── TextToMindmapModal.tsx  # テキストからマインドマップ生成モーダル（新規）
│   ├── Toolbar.tsx             # ツールバー（ノード操作ボタン群）
│   ├── made-with-dyad.tsx      # Dyadウォーターマーク
│   └── customNodes/            # カスタムノード
│       ├── RootNode.tsx        # ルートノード（角丸、直接編集可能）
│       └── NormalNode.tsx      # 通常ノード（四角形、直接編集可能）
├── lib/
│   ├── api.ts                  # LLM APIクライアント（fetchLLMResponse, generateMindmapFromChat, generateMindmapFromText）
│   ├── fileUtils.ts            # ファイル入出力（exportToMarkdown, importFromMarkdown）
│   ├── modelConfig.ts          # LLMモデル設定（availableModels, defaultModel）（新規）
│   ├── prompts.ts              # プロンプト定義（各種システムプロンプト、テンプレート関数）（新規）
│   ├── store.ts                # Zustand ストア（状態管理、全ロジック、スタンドアローンチャット機能）
│   └── utils.ts                # ユーティリティ（cn関数など）
├── types/
│   └── index.ts                # 型定義（MindMapNode, MindMapNodeData, MindMapEdge, ChatMessage, ViewMode）
├── hooks/
│   ├── use-mobile.tsx          # モバイル判定
│   └── use-toast.ts            # トースト通知フック
├── pages/
│   ├── Index.tsx               # メインページ（ビューモード切替）
│   └── NotFound.tsx            # 404ページ
├── utils/
│   └── toast.ts                # トースト通知ヘルパー（showSuccess, showError）
├── App.tsx                     # ルートコンポーネント（ルーティング）
├── main.tsx                    # エントリーポイント
├── globals.css                 # グローバルスタイル
└── vite-env.d.ts               # Vite型定義
```

---

## 5. 状態管理（Zustand Store）

### 5.1. 状態構造

```typescript
interface RFState {
  // Mindmap state
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;

  // View state
  viewMode: ViewMode;                      // 'mindmap' | 'chat'
  selectedModel: string;                   // 現在選択中のLLMモデル
  
  // In-mindmap chat sidebar
  isChatSidebarOpen: boolean;
  chatHistory: ChatMessage[];

  // Standalone chat mode
  standaloneChatHistory: ChatMessage[];    // チャットモード専用履歴
  isStandaloneChatLoading: boolean;        // チャットモード用ローディング状態
  isMindmapGenerating: boolean;            // マインドマップ生成中フラグ
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedModel: (model: string) => void;
  clearStandaloneChat: () => void;
  sendStandaloneMessage: (content: string) => Promise<void>;
  generateMindmapFromStandaloneChat: () => Promise<void>;
  generateMindmapFromTextInput: (text: string) => Promise<void>;
  // ... その他のアクション
}
```

### 5.2. 主要なアクション

- **ビューモード管理**:
  - `setViewMode(mode)`: マップモードとチャットモードを切り替え
  
- **モデル選択**:
  - `setSelectedModel(model)`: 使用するLLMモデルを動的に変更
  
- **スタンドアローンチャット**:
  - `sendStandaloneMessage(content)`: チャットモードでメッセージを送信し、LLMから回答を取得
  - `clearStandaloneChat()`: チャット履歴をクリア
  - `generateMindmapFromStandaloneChat()`: チャット履歴からマインドマップを生成
  
- **テキスト生成**:
  - `generateMindmapFromTextInput(text)`: 入力テキストからマインドマップを生成
  
- **ノード操作**:
  - `addRootNode()`: ルートノードを追加
  - `addChildNode()`: 子ノードを追加
  - `addMultipleChildNodes(titles)`: 複数の子ノードを一括追加（連想ワード機能）
  - `deleteSelectedNode()`: 選択ノードと子孫を削除
  - `updateSelectedNode(data)`: 選択ノードのデータを更新
  - `updateNodeData(nodeId, data)`: 特定ノードのデータを更新
  - `applyColorToDescendants()`: 選択ノードの色を子孫に適用
  - `alignNodes()`: ノードを自動整列
  
- **チャット機能（マップモード内）**:
  - `chatAndCreateNode(question)`: チャットサイドバーで質問を送信し、自動的に子ノードを生成
  - `toggleChatSidebar()`: チャットサイドバーの開閉
  
- **コンテキスト管理**:
  - `getContext(nodeId, includeCurrentNode?)`: 指定ノードまでの対話履歴を取得
  
- **データ管理**:
  - `loadState(newState)`: マインドマップをインポート

---

## 6. 使用シナリオ

### 6.1. シナリオ1: チャットからマインドマップ作成

1. アプリを起動し、ヘッダーの「Chat mode」タブをクリック。
2. チャット画面で自由にAIと対話を開始（ノード作成不要）。
3. 必要に応じて「魔法の杖」ボタンで入力テキストを改良。
4. 対話が進んだら「Generate Mindmap」ボタンをクリック。
5. LLMが会話内容を解析し、自動的にマインドマップを生成。
6. マップモードに切り替わり、生成されたマインドマップを確認・編集可能。

### 6.2. シナリオ2: テキストからマインドマップ作成

1. ヘッダーの「テキストから作成」ボタンをクリック。
2. モーダルに記事、レポート、議事録などの文章を入力。
3. 「マインドマップを生成」ボタンをクリック。
4. LLMが主要トピックと関連性を抽出し、階層構造を生成。
5. 自動的にノードが配置され、色分けされたマインドマップが表示される。
6. 必要に応じてノードを編集、移動、追加。

### 6.3. シナリオ3: コンテキスト対応の連想ワード生成

1. マップモードでノードを選択。
2. サイドバーの「Create Associated Nodes」ボタンをクリック。
3. LLMが選択ノードのタイトルと**親ノードからの対話履歴全体**を考慮。
4. 文脈に即した示唆に富む4つのキーワードを提案。
5. 自動的に4つの子ノードが生成される。

### 6.4. シナリオ4: LLMモデルの切り替え

1. ヘッダーのモデル選択ドロップダウンをクリック。
2. タスクに応じて最適なモデルを選択（例: 創造的な発想→GPT-5, 厳密な分析→Claude Sonnet）。
3. 以降、全てのLLM API呼び出しで選択したモデルが使用される。
4. チャット、質問実行、連想ワード生成、サマライズなど、全機能で動的に切り替え可能。

---

## 7. 改善履歴

### v2 → v3 の主な変更点

#### 7.1. チャット中心UIモード（改善項目1）

**課題**: マインドマップが常に中心で、アイデアの初期段階でノード作成が心理的障壁となっていた。

**実装内容**:
- `ViewMode` 型を追加（'mindmap' | 'chat'）
- `ChatView.tsx` を新規作成（スタンドアローンチャットUI）
- ヘッダーにビューモード切替タブを追加
- `standaloneChatHistory` でチャットモード専用の履歴を管理
- `sendStandaloneMessage` でチャットモード用のメッセージ送受信機能を実装
- `generateMindmapFromStandaloneChat` でチャット履歴からマインドマップ自動生成
- メッセージ改良機能（`TEXT_REFINEMENT_PROMPT`）の実装

**効果**:
- アプリ起動後、即座にAIとの対話を開始可能
- ブレインストーミング段階でのハードルが低下
- 自由な対話から構造化されたマインドマップへの自然な流れを実現

#### 7.2. AIによる連想ワード提案の高度化（改善項目2）

**課題**: 単一ノードのタイトルのみを基準にしており、文脈から外れた一般的な単語が提案されがち。

**実装内容**:
- `createAssociationPromptWithContext` 関数を新規実装（`lib/prompts.ts`）
- `ASSOCIATION_WITH_CONTEXT_PROMPT_TEMPLATE` プロンプトを追加
- `getContext` 関数で取得した対話履歴全体をLLMに提供
- Sidebar.tsx の `handleAssociateNodes` 関数を更新してコンテキストを渡すように変更

**効果**:
- 親ノードからの対話の流れを考慮した提案が可能に
- より文脈に即した、示唆に富むキーワードの生成
- マインドマップの深掘りがより意味のあるものに

#### 7.3. LLMモデル選択機能（改善項目3）

**課題**: `.env` ファイルでの固定設定で、ユーザーが動的に切り替えできなかった。

**実装内容**:
- `lib/modelConfig.ts` を新規作成（モデル設定の一元管理）
- `availableModels` 配列で利用可能なモデルを定義
- `selectedModel` ステートをZustandストアに追加
- `setSelectedModel` アクションを実装
- Header.tsx にモデル選択ドロップダウンを追加（shadcn/ui の Select コンポーネント使用）
- 全ての `fetchLLMResponse` 呼び出しに `model` パラメータを追加
- 8種類のLLMモデルをサポート（GPT-5, Qwen3, Claude, Gemini）

**効果**:
- タスクの性質に応じて最適なモデルをリアルタイムで選択可能
- 創造的な発想、厳密な分析など、用途に応じた使い分けが可能
- 全てのLLM機能（チャット、質問実行、連想ワード、サマライズ等）で統一的に適用

#### 7.4. テキストからマインドマップ自動生成（改善項目4）

**課題**: 既存の文章やドキュメントからマップを生成する機能がなかった。

**実装内容**:
- `TextToMindmapModal.tsx` を新規作成（テキスト入力用モーダルUI）
- `generateMindmapFromTextInput` アクションをストアに追加
- `generateMindmapFromText` API関数を実装（`lib/api.ts`）
- `TEXT_TO_MINDMAP_SYSTEM_PROMPT` と `TEXT_TO_MINDMAP_INSTRUCTION` プロンプトを追加
- LLMに詳細な指示を送信（ルートノード数、階層深度、タイトル長、色分けなど）
- ヘッダーに「テキストから作成」ボタンを追加

**効果**:
- 記事、レポート、議事録などからワンクリックでマインドマップを生成
- 主要トピックと関連性の自動抽出
- 階層構造の自動構築（3-5レベル推奨）
- 色分けの自動割り当てで視認性向上
- 日本語テキストに対応

---

## 8. 今後の拡張可能性

### 8.1. 検討中の機能

- **エクスポート形式の追加**: PDF、画像（PNG/SVG）形式でのエクスポート
- **リアルタイム共同編集**: 複数ユーザーでの同時編集機能
- **テンプレート機能**: よく使うマインドマップ構造をテンプレートとして保存
- **検索機能**: ノードのタイトルや内容を横断検索
- **履歴機能**: マインドマップの変更履歴を保存し、過去の状態に戻す
- **モバイル対応**: タッチ操作に最適化したUI

### 8.2. LLM連携の強化

- **ストリーミング応答**: LLMからの回答をリアルタイムで表示
- **多言語対応**: 日本語以外の言語での連想ワード生成
- **カスタムプロンプト**: ユーザーが独自のプロンプトを定義可能に
- **ファインチューニング**: 特定ドメインに特化したモデルの学習

---

## 9. まとめ

本アプリケーションは、`05_upgrade_plan_1.md` で提案された4つの改善項目を完全に実装し、以下の点で大幅に機能強化されました:

1. **チャット中心UIモード**: AIとの対話を起点とした新しいワークフローを実現
2. **コンテキスト対応の連想ワード生成**: 対話の文脈を考慮した、より意味のある提案
3. **LLMモデル選択機能**: タスクに応じた最適なモデルの動的選択
4. **テキストから自動生成**: 既存文章からのマインドマップ作成

これにより、ユーザーは「自由な対話」から「構造化された思考」へと自然に移行でき、より柔軟で高機能なマインドマップアプリケーションとなりました。
