/**
 * LLM プロンプト定義ファイル
 * アプリケーション全体で使われるプロンプトを一箇所で管理
 */

import type { ChatMessage } from '@/types';

// 環境変数から取得するプロンプト
export const SUMMARIZE_PROMPT = import.meta.env.VITE_SUMMARIZE_PROMPT || 'Please summarize this conversation concisely in Markdown format.';

// チャット応答用のシステムプロンプト
export const CHAT_RESPONSE_SYSTEM_PROMPT = 'コンテキストの流れに沿って最適な回答を100文字程度にまとめて返答してください';

// タイトル要約プロンプト
export const TITLE_SUMMARIZATION_PROMPT = 'Summarize the following question and answer into a short, concise title (around 10-15 characters). Output only the title text.\n\nQuestion: {question}\n\nAnswer: {answer}';

// 連想語生成プロンプト（テンプレート）
export const ASSOCIATION_GENERATION_PROMPT_TEMPLATE = '「{title}」という単語から連想される、関連性の高い単語を4つ、日本語で、カンマ(,)区切りで出力してください。例: りんご,ゴリラ,ラッパ,パセリ。余計な説明や番号付けは不要です。';

// テキスト改善プロンプト
export const TEXT_REFINEMENT_PROMPT = (context: ChatMessage[], text: string) => `あなたはチャット用の入力文を改善するアシスタントです。以下のテキストについて、誤字脱字や文法の誤りを直し、より明瞭で自然な表現に整えてください。与えられたチャット文脈も参考にしてください。原意は厳密に保持してください。出力は日本語のテキストのみを返し、余計な説明や装飾、引用符は一切含めないでください。

チャット文脈:
${context.map(m => `${m.role}: ${m.content}`).join('\n\n')}

改善対象テキスト: "${text}"`;

// マインドマップ生成用のシステムプロンプト
export const MINDMAP_GENERATION_SYSTEM_PROMPT = 'You are an assistant that converts a chat conversation into a mind map structure. You MUST return ONLY valid JSON. Do not include any explanation, markdown formatting, or additional text before or after the JSON.';

// マインドマップ生成用の指示
export const MINDMAP_GENERATION_INSTRUCTION = `Convert the following conversation into a concise mind map.

Return the response as valid JSON ONLY, in this exact schema:
{"nodes": [{"id": "string", "title": "string", "color": "#RRGGBB"}], "edges": [{"source": "string", "target": "string"}]}

Rules:
- ids must be unique and referenced by edges
- Include 1-3 root topics with reasonable hierarchy depth
- Titles should be short and meaningful
- Include color codes in hex format (e.g., #ff6b6b)
- Prefer Japanese if the conversation is in Japanese
- Return ONLY the JSON object, nothing else`;

// テンプレート関数
export const createTitleSummarizationPrompt = (question: string, answer: string) => {
  return TITLE_SUMMARIZATION_PROMPT
    .replace('{question}', question)
    .replace('{answer}', answer);
};

export const createAssociationPrompt = (title: string) => {
  return ASSOCIATION_GENERATION_PROMPT_TEMPLATE.replace('{title}', title);
};
