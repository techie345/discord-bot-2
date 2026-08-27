import { describe, expect, it } from 'vitest';
import { isEligibleGuildMessage, splitDiscordMessage } from '../src/message-utils.js';

const normalMessage = {
  guildId: 'guild-id',
  author: { bot: false },
  webhookId: null,
  content: 'Hello there',
};

describe('isEligibleGuildMessage', () => {
  it('accepts a normal guild message', () => {
    expect(isEligibleGuildMessage(normalMessage)).toBe(true);
  });

  it.each([
    ['a DM', { guildId: null }],
    ['a bot message', { author: { bot: true } }],
    ['a webhook message', { webhookId: 'webhook-id' }],
    ['a blank message', { content: '   ' }],
  ])('rejects %s', (_description, override) => {
    expect(isEligibleGuildMessage({ ...normalMessage, ...override })).toBe(false);
  });
});

describe('splitDiscordMessage', () => {
  it('returns short content unchanged', () => {
    expect(splitDiscordMessage('Hello')).toEqual(['Hello']);
  });

  it('splits long content into ordered Discord-sized chunks', () => {
    const chunks = splitDiscordMessage('a'.repeat(4_001));

    expect(chunks.map((chunk) => chunk.length)).toEqual([2000, 2000, 1]);
    expect(chunks.join('')).toBe('a'.repeat(4_001));
  });

  it('does not return empty chunks', () => {
    expect(splitDiscordMessage('\n'.repeat(2_001)).every(Boolean)).toBe(true);
  });
});
