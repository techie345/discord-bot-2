import type { AppConfig } from './config.js';

export interface ChatClient {
  chat(request: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    stream: false;
  }): Promise<{ message?: { content?: string }}>;
}

export function createOllamaResponder(
  client: ChatClient,
  config: Pick<AppConfig, 'ollamaModel' | 'ollamaSystemPrompt' | 'ollamaTimeoutMs'>,
): (content: string) => Promise<string> {
  return async (content: string): Promise<string> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Ollama request timed out')), config.ollamaTimeoutMs);
    });
    const request = client.chat({
      model: config.ollamaModel,
      messages: [
        { role: 'system', content: config.ollamaSystemPrompt },
        { role: 'user', content },
      ],
      stream: false,
    });
    const response = await Promise.race([request, timeoutPromise]);
    if (timeout) clearTimeout(timeout);
    const result = response.message?.content?.trim();
    if (!result) throw new Error('Ollama returned an empty response');
    return result;
  };
}
