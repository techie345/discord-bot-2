import { describe, expect, it, vi } from 'vitest';
import { createAskOllamaCommand, createMessageCommandHandler, registerMessageCommand } from '../src/command.js';

const config = { maxConcurrentRequests: 2, fallbackReply: 'Try again later.' };

function interaction(content = 'hello', channel: { sendTyping: () => Promise<unknown> } | null = {
  sendTyping: vi.fn().mockResolvedValue(undefined),
}) {
  return {
    isMessageContextMenuCommand: () => true,
    commandName: 'Ask Ollama',
    guildId: 'guild-id',
    targetMessage: {
      id: 'message-id',
      content,
      guildId: 'guild-id',
      author: { bot: false },
      webhookId: null,
      channel,
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
  };
}

describe('message command', () => {
  it('declares a user-installed server message context command', () => {
    expect(createAskOllamaCommand()).toMatchObject({
      name: 'Ask Ollama',
      type: 3,
      integration_types: [1],
      contexts: [0],
    });
  });

  it('uses the selected message and edits the deferred response', async () => {
    const target = interaction();
    const responder = vi.fn().mockResolvedValue('answer');
    const handler = createMessageCommandHandler({ responder, config, logger: console });

    await handler(target as never);

    expect(target.deferReply).toHaveBeenCalledOnce();
    expect(responder).toHaveBeenCalledWith('hello');
    expect(target.editReply).toHaveBeenCalledWith('answer');
  });

  it('uses follow-ups for response chunks after the initial response', async () => {
    const target = interaction();
    const responder = vi.fn().mockResolvedValue('a'.repeat(2_001));
    const handler = createMessageCommandHandler({ responder, config, logger: console });

    await handler(target as never);

    expect(target.editReply.mock.calls.map(([reply]) => reply.length)).toEqual([2000]);
    expect(target.followUp).toHaveBeenCalledWith('a');
  });

  it('does not invoke Ollama for an ineligible selected message', async () => {
    const target = interaction('   ');
    const responder = vi.fn();
    const handler = createMessageCommandHandler({ responder, config, logger: console });

    await handler(target as never);

    expect(responder).not.toHaveBeenCalled();
    expect(target.deferReply).toHaveBeenCalledOnce();
    expect(target.editReply).toHaveBeenCalledWith('I can only process non-empty human messages.');
  });

  it('processes a selected message when its channel is not cached', async () => {
    const target = interaction('hello', null);
    const responder = vi.fn().mockResolvedValue('answer');
    const logger = { error: vi.fn(), info: vi.fn() };
    const handler = createMessageCommandHandler({ responder, config, logger });

    await handler(target as never);

    expect(responder).toHaveBeenCalledWith('hello');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('registers the command for the application globally', async () => {
    const rest = {
      setToken: vi.fn().mockReturnThis(),
      put: vi.fn().mockResolvedValue([]),
    };

    await registerMessageCommand(rest, 'application-id', 'discord-token');

    expect(rest.setToken).toHaveBeenCalledWith('discord-token');
    expect(rest.put).toHaveBeenCalledWith('/applications/application-id/commands', {
      body: [createAskOllamaCommand()],
    });
  });
});
