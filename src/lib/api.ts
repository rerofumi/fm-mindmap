import { showError } from '@/utils/toast';
import type { ChatMessage } from '@/types';
import { SUMMARIZE_PROMPT, MINDMAP_GENERATION_SYSTEM_PROMPT, MINDMAP_GENERATION_INSTRUCTION } from './prompts';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-3.5-turbo';

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
  // Construct a single, comprehensive prompt that includes all instructions
  const combinedPrompt = `${MINDMAP_GENERATION_SYSTEM_PROMPT}

${MINDMAP_GENERATION_INSTRUCTION}

Chat conversation:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}`;

  const messages: Message[] = [
    { role: 'user', content: combinedPrompt },
  ];

  const raw = await fetchLLMResponse(messages);
  const jsonText = extractJsonBlock(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('JSON parse error. Raw response:', raw);
    console.error('Extracted JSON text:', jsonText);
    throw new Error(`Failed to parse JSON from LLM response: ${e instanceof Error ? e.message : 'unknown error'}`);
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
