import { showError } from '@/utils/toast';

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