import type { AppConfig } from './config.js';
import { Logger } from './logger.js';

export interface ChatClient {
  chat(request: {
    model: string;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    stream: false;
  }): Promise<{ message?: { content?: string }}>;
}

export function createOllamaResponder(
  client: ChatClient,
  config: Pick<AppConfig, 'ollamaHost' | 'ollamaModel' | 'ollamaSystemPrompt' | 'ollamaTimeoutMs'>,
  logger: Pick<Logger, 'error' | 'info'> = new Logger(),
): (content: string) => Promise<string> {
  return async (content: string): Promise<string> => {
    const startedAt = Date.now();
    logger.info('Ollama request started', { host: config.ollamaHost, model: config.ollamaModel });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Ollama request timed out')), config.ollamaTimeoutMs);
    });
    const request = Promise.resolve().then(() => client.chat({
      model: config.ollamaModel,
      messages: [
        { role: 'system', content: config.ollamaSystemPrompt },
        { role: 'user', content },
      ],
      stream: false,
    }));
    let response: Awaited<typeof request>;
    try {
      response = await Promise.race([request, timeoutPromise]);
    } catch (error) {
      logger.error('Ollama request failed', error, {
        host: config.ollamaHost,
        model: config.ollamaModel,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    const result = response.message?.content?.trim();
    if (!result) {
      const error = new Error('Ollama returned an empty response');
      logger.error('Ollama response was empty', error, {
        host: config.ollamaHost,
        model: config.ollamaModel,
        elapsedMs: Date.now() - startedAt,
      });
      throw error;
    }
    logger.info('Ollama request completed', {
      host: config.ollamaHost,
      model: config.ollamaModel,
      elapsedMs: Date.now() - startedAt,
    });
    return result;
  };
}
