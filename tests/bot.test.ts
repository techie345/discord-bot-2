import { describe, expect, it, vi } from 'vitest';
import { createMessageHandler } from '../src/bot.js';

function message(content: string) {
  return {
    id: `message-${content}`,
    guildId: 'guild-id',
    author: { bot: false },
    webhookId: null,
    content,
    channel: { sendTyping: vi.fn().mockResolvedValue(undefined) },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

const config = { maxConcurrentRequests: 2, fallbackReply: 'Try again later.' };

describe('createMessageHandler', () => {
  it('generates and replies with ordered chunks', async () => {
    const responder = vi.fn().mockResolvedValue('a'.repeat(2_001));
    const target = message('hello');
    const handler = createMessageHandler({ responder, config, logger: console });

    await handler(target as never);

    expect(responder).toHaveBeenCalledWith('hello');
    expect(target.channel.sendTyping).toHaveBeenCalledOnce();
    expect(target.reply.mock.calls.map(([reply]) => reply.length)).toEqual([2000, 1]);
  });

  it('ignores ineligible messages', async () => {
    const responder = vi.fn();
    const handler = createMessageHandler({ responder, config, logger: console });
    const dm = { ...message('hello'), guildId: null };
    const bot = { ...message('hello'), author: { bot: true } };

    await handler(dm as never);
    await handler(bot as never);

    expect(responder).not.toHaveBeenCalled();
  });

  it('limits concurrent Ollama requests', async () => {
    let active = 0;
    let peak = 0;
    const responder = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return 'reply';
    });
    const handler = createMessageHandler({ responder, config, logger: console });

    await Promise.all(
      Array.from({ length: 5 }, (_, index) => handler(message(String(index)) as never)),
    );

    expect(peak).toBe(2);
  });

  it('sends a fallback when generation fails', async () => {
    const responder = vi.fn().mockRejectedValue(new Error('Ollama unavailable'));
    const target = message('hello');
    const logger = { error: vi.fn() };
    const handler = createMessageHandler({ responder, config, logger });

    await handler(target as never);

    expect(target.reply).toHaveBeenCalledWith('Try again later.');
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
