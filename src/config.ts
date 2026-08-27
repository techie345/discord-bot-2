export interface AppConfig {
  discordToken: string;
  ollamaHost: string;
  ollamaApiKey: string;
  ollamaModel: string;
  ollamaSystemPrompt: string;
  ollamaTimeoutMs: number;
  maxConcurrentRequests: number;
  fallbackReply: string;
}

function required(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function positiveInteger(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${key} must be a positive integer`);
  return value;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const ollamaHost = required(env, 'OLLAMA_HOST');
  let parsedHost: URL;
  try {
    parsedHost = new URL(ollamaHost);
  } catch {
    throw new Error('OLLAMA_HOST must be a valid HTTPS URL');
  }
  if (parsedHost.protocol !== 'https:') throw new Error('OLLAMA_HOST must use HTTPS');

  return {
    discordToken: required(env, 'DISCORD_TOKEN'),
    ollamaHost: parsedHost.toString().replace(/\/$/, ''),
    ollamaApiKey: required(env, 'OLLAMA_API_KEY'),
    ollamaModel: env.OLLAMA_MODEL?.trim() || 'llama3.2',
    ollamaSystemPrompt: env.OLLAMA_SYSTEM_PROMPT?.trim() || 'You are a concise and helpful Discord assistant.',
    ollamaTimeoutMs: positiveInteger(env, 'OLLAMA_TIMEOUT_MS', 60_000),
    maxConcurrentRequests: positiveInteger(env, 'MAX_CONCURRENT_REQUESTS', 2),
    fallbackReply: env.FALLBACK_REPLY?.trim() || 'I could not generate a reply right now.',
  };
}
