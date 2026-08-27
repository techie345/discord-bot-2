import type { AppConfig } from './config.js';

export interface ChatClient {
  chat(request: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    stream: false;
    signal?: AbortSignal;
  }): Promise<{ message?: { content?: string }}>;
}

export function createOllamaResponder(
  client: ChatClient,
  config: Pick<AppConfig, 'ollamaModel' | 'ollamaSystemPrompt' | 'ollamaTimeoutMs'>,
): (content: string) => Promise<string> {
  return async (content: string): Promise<string> => {
    const response = await client.chat({
      model: config.ollamaModel,
      messages: [
        { role: 'system', content: config.ollamaSystemPrompt },
        { role: 'user', content },
      ],
      stream: false,
      signal: AbortSignal.timeout(config.ollamaTimeoutMs),
    });
    const result = response.message?.content?.trim();
    if (!result) throw new Error('Ollama returned an empty response');
    return result;
  };
}
