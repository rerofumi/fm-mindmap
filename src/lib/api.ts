import { showError } from '@/utils/toast';
import type { ChatMessage } from '@/types';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';
export const SUMMARIZE_PROMPT = import.meta.env.VITE_SUMMARIZE_PROMPT || 'Please summarize this conversation concisely in Markdown format.';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const fetchLLMResponse = async (messages: Message[]): Promise<string> => {
  if (!API_KEY || API_KEY === "your_api_key_here") {
    const errorMessage = 'VITE_OPENROUTER_API_KEY is not set in .env file. Please set it and rebuild the app.';
    showError(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'API request failed';
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching LLM response:', error);
    if (!(error instanceof Error && error.message.includes('VITE_OPENROUTER_API_KEY'))) {
        showError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    throw error;
  }
};

// Generate a mindmap JSON from a standalone chat history using the LLM
export const generateMindmapFromChat = async (history: ChatMessage[]): Promise<{ nodes: Array<{ id: string; title: string; color?: string }>; edges: Array<{ source: string; target: string }> }> => {
  const system = 'You are an assistant that converts a chat conversation into a mind map structure. Return ONLY strict JSON with keys "nodes" and "edges". No explanation.';
  const instruction = `Convert the following conversation into a concise mind map.\nReturn JSON only in this exact schema:\n{\n  "nodes": [ { "id": "string", "title": "string", "color": "#RRGGBB" } ],\n  "edges": [ { "source": "string", "target": "string" } ]\n}\nRules:\n- ids must be unique and referenced by edges.\n- Include 1-3 root topics and reasonable hierarchy depth.\n- Titles should be short.\n- Prefer Japanese if the conversation is in Japanese.`;

  const messages: Message[] = [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role, content: m.content }) as Message),
    { role: 'user', content: instruction },
  ];

  const raw = await fetchLLMResponse(messages);
  const jsonText = extractJsonBlock(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Failed to parse JSON from LLM response');
  }
  if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Invalid mindmap JSON format');
  }
  // Coerce minimal shape
  return {
    nodes: parsed.nodes.map((n: any) => ({ id: String(n.id), title: String(n.title), color: n.color && String(n.color) })),
    edges: parsed.edges.map((e: any) => ({ source: String(e.source), target: String(e.target) })),
  };
};

function extractJsonBlock(text: string): string {
  const fence = text.match(/```json([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Try generic triple backticks
  const anyFence = text.match(/```([\s\S]*?)```/);
  if (anyFence) return anyFence[1].trim();
  // Otherwise assume the whole text is JSON
  return text.trim();
}
