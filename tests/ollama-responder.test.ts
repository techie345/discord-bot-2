import { describe, expect, it, vi } from 'vitest';
import { createOllamaResponder, type ChatClient } from '../src/ollama-responder.js';

const config = {
  ollamaHost: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  ollamaSystemPrompt: 'Be concise.',
  ollamaTimeoutMs: 1_000,
};

function fakeClient(response: unknown): ChatClient & { chat: ReturnType<typeof vi.fn> } {
  return { chat: vi.fn().mockResolvedValue(response) };
}

describe('createOllamaResponder', () => {
  it('sends only the system prompt and current message', async () => {
    const client = fakeClient({ message: { content: 'Generated reply' } });
    const responder = createOllamaResponder(client, config);

    await expect(responder('Current message')).resolves.toBe('Generated reply');
    expect(client.chat).toHaveBeenCalledWith(expect.objectContaining({
      model: 'llama3.2',
      stream: false,
      messages: [
        { role: 'system', content: 'Be concise.' },
        { role: 'user', content: 'Current message' },
      ],
    }));
  });

  it('logs nested client errors with request metadata', async () => {
    const client = fakeClient(undefined);
    const logger = { error: vi.fn(), info: vi.fn() };
    const error = new Error('fetch failed', { cause: new Error('ECONNREFUSED') });
    client.chat.mockRejectedValue(error);
    const responder = createOllamaResponder(client, config, logger);

    await expect(responder('Hello')).rejects.toThrow('fetch failed');
    expect(logger.error).toHaveBeenCalledWith('Ollama request failed', error, expect.objectContaining({
      host: 'http://localhost:11434',
      model: 'llama3.2',
    }));
  });

  it('rejects an empty response', async () => {
    const responder = createOllamaResponder(fakeClient({ message: { content: '  ' } }), config);

    await expect(responder('Hello')).rejects.toThrow('empty response');
  });

  it('propagates client errors', async () => {
    const client = fakeClient(undefined);
    client.chat.mockRejectedValue(new Error('server unavailable'));
    const responder = createOllamaResponder(client, config);

    await expect(responder('Hello')).rejects.toThrow('server unavailable');
  });

  it('rejects when the Ollama request exceeds the timeout', async () => {
    const client = fakeClient(new Promise(() => undefined));
    const responder = createOllamaResponder(client, { ...config, ollamaTimeoutMs: 5 });

    await expect(responder('Hello')).rejects.toThrow('timed out');
  });
});
