# 開発ステップB: LLM連携とチャット機能の実装

## 1. 目標
各ノードに紐づくLLMチャット機能を完成させ、アプリの核となる価値を提供する。このステップが完了すると、ユーザーはマインドマップの各ノードを思考の出発点として、AIとの対話を通じてアイデアを深掘りできるようになる。

---

## 2. 関連仕様

### 2.1. 前提
- ステップAで実装されたマインドマップの基本構造が完成していること。
- ノードオブジェクトに以下のプロパティが追加されていること:
    - `question`: LLMへの質問テキスト (string, 初期値: '')
    - `answer`: LLMからの回答テキスト (string, 初期値: '')

### 2.2. LLM連携
- **APIクライアント**:
    - [OpenRouter](https://openrouter.ai/) のAPIと通信を行うクライアントモジュールを実装する。
    - APIキーと使用モデルは `.env` ファイルに定義し、アプリケーションから読み込む。
- **コンテキスト構築**:
    - LLMに質問を送信する際、選択中のノードから親をたどり、ルートノードまでの経路に含まれる全ノードの「質問」と「回答」を収集する。
    - 収集したQ&Aを `[{role: 'user', content: '...'}, {role: 'assistant', content: '...'}]` の形式に整形し、APIリクエストの会話履歴（コンテキスト）として使用する。
- **実行と表示**:
    - サイドバーの「実行」ボタンで、構築したコンテキストと共に「質問」をAPIに送信する。
    - APIからのレスポンスを「回答」としてノードデータに保存し、サイドバーに表示する。
- **サマライズ**:
    - サイドバーの「サマライズ」ボタンで、現在のコンテキスト（会話履歴）の要約をLLMにリクエストする。
    - 結果をMarkdown形式でモーダルダイアログに表示する。

### 2.3. UIコンポーネント
- **詳細情報サイドバーの拡張**:
    - 「質問」と「回答」のための複数行テキストエリアを追加する。
    - LLMへのリクエストを実行する「実行」ボタンと、「サマライズ」ボタンを追加する。
- **サマライズモーダル**:
    - サマライズ結果をMarkdown形式で表示するためのダイアログまたはモーダルウィンドウ。

---

## 3. タスク一覧

1.  **データ構造の拡張**
    - `Zustand` ストアのノードオブジェクトに `question` と `answer` プロパティを追加する。
2.  **サイドバーUIの拡張**
    - `Sidebar.tsx` を変更し、`question` と `answer` のためのテキストエリアを追加する。
    - これらのテキストエリアの値を、対応するノードの状態と双方向でバインディングする。
    - 「実行」ボタンと「サマライズ」ボタンをUIに追加する。
3.  **APIクライアントの実装**
    - `.env` ファイルに `VITE_OPENROUTER_API_KEY` と `VITE_OPENROUTER_MODEL` を定義し、アプリで読み込めるように設定する。
    - `src/lib/OpenRouterAPI.ts` などのファイルを作成し、`fetch` を使ってOpenRouter APIにリクエストを送信する関数を実装する。
    - リクエストボディには、モデル名、メッセージ配列（コンテキスト）を含める。
4.  **コンテキスト構築機能の実装**
    - `Zustand` ストア内に、指定されたノードIDからルートまで遡り、コンテキスト配列を生成するヘルパー関数を実装する。
    - `question` と `answer` が空でないノードのみをコンテキストに含める。
5.  **LLM連携ロジックの実装**
    - 「実行」ボタンがクリックされたら、現在のノードIDでコンテキスト構築関数を呼び出す。
    - 構築したコンテキストとサイドバーの質問テキストをAPIクライアントに渡して、LLMにリクエストを送信する。
    - APIからのレスポンスを受け取り、`answer` プロパティを更新するストアのアクションを呼び出す。
    - リクエスト中のローディング状態を管理し、UIにフィードバックする（例: ボタンを無効化）。
6.  **サマライズ機能の実装**
    - 「サマライズ」ボタンがクリックされたら、現在のコンテキストに「この会話を要約してください」といった指示を追加してLLMにリクエストする。
    - 結果を表示するための `SummarizeModal.tsx` コンポーネントを作成する。
    - APIからの要約結果をモーダルに表示する。
7.  **エラーハンドリング**
    - API通信失敗時のエラーメッセージをユーザーに通知する仕組みを実装する（例: `react-hot-toast`）。

