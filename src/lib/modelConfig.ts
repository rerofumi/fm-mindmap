/**
 * Configuration for available LLM models
 * This file contains the list of models available for selection in the application
 */

export interface ModelOption {
  value: string;
  label: string;
}

/**
 * Default fixed list of models (fallback if no env var is set)
 */
const defaultFixedModels: ModelOption[] = [
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5.1-chat', label: 'GPT-5.1 Chat' },
  { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120b' },
  { value: 'qwen/qwen3-next-80b-a3b-thinking', label: 'Qwen3 Next (reasonal)' },
  { value: 'qwen/qwen3-next-80b-a3b-instruct', label: 'Qwen3 Next (instruct)' },
  { value: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

const getAvailableModels = (): ModelOption[] => {
  const envList = import.meta.env.LLM_MODEL_LIST;
  if (envList && typeof envList === 'string' && envList.trim().length > 0) {
    return envList.split(',').map(m => {
      const trimmed = m.trim();
      return { value: trimmed, label: trimmed };
    });
  }
  return defaultFixedModels;
};

/**
 * Available LLM models
 * Uses LLM_MODEL_LIST environment variable if available, otherwise uses default list
 */
export const availableModels: ModelOption[] = getAvailableModels();

/**
 * Default model to use if not specified
 * Uses LLM_MODEL_NAME environment variable if available, otherwise uses the first available model or a fallback
 */
export const defaultModel = import.meta.env.LLM_MODEL_NAME ||
  (availableModels.length > 0 ? availableModels[0].value : 'openai/gpt-5-mini');
