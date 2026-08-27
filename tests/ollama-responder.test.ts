import { describe, expect, it, vi } from 'vitest';
import { createOllamaResponder, type ChatClient } from '../src/ollama-responder.js';

const config = {
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
