import { describe, expect, it, vi } from 'vitest';

const { dotenvConfig } = vi.hoisted(() => ({ dotenvConfig: vi.fn() }));

vi.mock('dotenv', () => ({ config: dotenvConfig }));
vi.mock('discord.js', () => ({
  Client: class {
    once() {}
    on() {}
    login() { return Promise.resolve('logged-in'); }
    destroy() {}
  },
  Events: { ClientReady: 'ready', MessageCreate: 'messageCreate' },
  GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
}));
vi.mock('ollama', () => ({ Ollama: class {} }));
vi.mock('../src/config.js', () => ({
  loadConfig: () => ({
    discordToken: 'discord-token',
    ollamaHost: 'https://ollama.example.lan',
    ollamaModel: 'llama3.2',
    ollamaSystemPrompt: 'Be concise.',
    ollamaTimeoutMs: 1_000,
    maxConcurrentRequests: 1,
    fallbackReply: 'Fallback',
  }),
}));
vi.mock('../src/bot.js', () => ({
  createMessageHandler: () => ({ stop() {}, waitForIdle() { return Promise.resolve(); } }),
}));
vi.mock('../src/ollama-responder.js', () => ({ createOllamaResponder: () => ({}) }));
vi.mock('../src/logger.js', () => ({ Logger: class {} }));

describe('startup configuration', () => {
  it('loads dotenv with override enabled', async () => {
    await import('../src/index.js');

    expect(dotenvConfig).toHaveBeenCalledWith({ override: true });
  });
});
