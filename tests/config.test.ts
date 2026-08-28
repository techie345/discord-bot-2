import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const validEnv = {
  DISCORD_TOKEN: 'discord-token',
  OLLAMA_HOST: 'https://ollama.example.lan',
  OLLAMA_API_KEY: 'ollama-key',
};

describe('loadConfig', () => {
  it('rejects a missing Discord token', () => {
    const env = { ...validEnv, DISCORD_TOKEN: undefined };

    expect(() => loadConfig(env)).toThrow('DISCORD_TOKEN');
  });

  it('rejects an Ollama host with an unsupported protocol', () => {
    const env = { ...validEnv, OLLAMA_HOST: 'ftp://ollama.example.lan' };

    expect(() => loadConfig(env)).toThrow('OLLAMA_HOST');
  });

  it('applies defaults for optional settings', () => {
    const config = loadConfig(validEnv);

    expect(config.ollamaModel).toBe('llama3.2');
    expect(config.ollamaSystemPrompt).toContain('funny');
    expect(config.ollamaTimeoutMs).toBe(60_000);
    expect(config.maxConcurrentRequests).toBe(2);
    expect(config.maxQueuedRequests).toBe(20);
    expect(config.fallbackReply).toBe('I could not generate a reply right now.');
  });

  it('parses numeric settings', () => {
    const config = loadConfig({
      ...validEnv,
      OLLAMA_TIMEOUT_MS: '1500',
      MAX_CONCURRENT_REQUESTS: '4',
    });

    expect(config.ollamaTimeoutMs).toBe(1500);
    expect(config.maxConcurrentRequests).toBe(4);
  });
});
