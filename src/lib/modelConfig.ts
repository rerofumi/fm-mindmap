/**
 * Configuration for available LLM models
 * This file contains the list of models available for selection in the application
 */

export interface ModelOption {
  value: string;
  label: string;
}

/**
 * Available LLM models for OpenRouter
 * Add or remove models here to update the model selection dropdown
 */
export const availableModels: ModelOption[] = [
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5.1-chat', label: 'GPT-5.1 Chat' },
  { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120b' },
  { value: 'qwen/qwen3-next-80b-a3b-thinking', label: 'Qwen3 Next (reasonal)' },
  { value: 'qwen/qwen3-next-80b-a3b-instruct', label: 'Qwen3 Next (instruct)' },
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

/**
 * Default model to use if not specified
 */
export const defaultModel = 'openai/gpt-5-mini';
