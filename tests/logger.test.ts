import { describe, expect, it, vi } from 'vitest';
import { Logger } from '../src/logger.js';

describe('Logger', () => {
  it('serializes nested errors without logging secrets or message content', () => {
    const sink = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    const logger = new Logger(sink);
    const error = new Error('fetch failed', { cause: new Error('ECONNREFUSED') });

    logger.error('Ollama request failed', error, {
      host: 'http://localhost:11434',
      model: 'llama3.2',
      authorization: 'Bearer secret',
      content: 'private message',
    });

    expect(sink.error).toHaveBeenCalledWith(expect.objectContaining({
      err: expect.objectContaining({
        name: 'Error',
        message: 'fetch failed',
        cause: expect.objectContaining({ name: 'Error', message: 'ECONNREFUSED' }),
      }),
      host: 'http://localhost:11434',
      model: 'llama3.2',
    }), 'Ollama request failed');
  });
});
