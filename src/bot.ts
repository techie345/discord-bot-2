import type { AppConfig } from './config.js';
import { isEligibleGuildMessage, splitDiscordMessage } from './message-utils.js';

interface BotMessage {
  id: string;
  guildId: string | null;
  author: { bot: boolean };
  webhookId: string | null;
  content: string;
  channel: { sendTyping?: () => Promise<unknown> } | null;
  reply: (content: string) => Promise<unknown>;
}

interface MessageLogger {
  error: (message: string, error?: unknown, metadata?: Record<string, unknown>) => void;
  info?: (message: string, metadata?: Record<string, unknown>) => void;
}

interface HandlerDependencies {
  responder: (content: string) => Promise<string>;
  config: Pick<AppConfig, 'maxConcurrentRequests' | 'fallbackReply'> &
    Partial<Pick<AppConfig, 'maxQueuedRequests'>>;
  logger: MessageLogger;
}

export interface MessageHandler {
  (message: BotMessage): Promise<void>;
  stop(): void;
  waitForIdle(): Promise<void>;
}

export function createMessageHandler({ responder, config, logger }: HandlerDependencies): MessageHandler {
  const queue: Array<{ message: BotMessage; resolve: () => void }> = [];
  const idleWaiters: Array<() => void> = [];
  let active = 0;
  let accepting = true;

  const resolveIdle = (): void => {
    if (active === 0 && queue.length === 0) {
      while (idleWaiters.length) idleWaiters.shift()?.();
    }
  };

  const logError = (message: BotMessage, error: unknown): void => {
    logger.error('Message handling failed', error, {
      messageId: message.id,
      guildId: message.guildId,
    });
  };

  const process = async (message: BotMessage): Promise<void> => {
    const startedAt = Date.now();
    logger.info?.('Processing Discord message', { messageId: message.id, guildId: message.guildId });
    try {
      await message.channel?.sendTyping?.();
    } catch (error) {
      logError(message, error);
    }

    let response: string;
    try {
      response = await responder(message.content);
    } catch (error) {
      logError(message, error);
      try {
        await message.reply(config.fallbackReply);
      } catch (replyError) {
        logError(message, replyError);
      }
      return;
    }

    try {
      for (const chunk of splitDiscordMessage(response)) await message.reply(chunk);
      logger.info?.('Discord message processed', {
        messageId: message.id,
        guildId: message.guildId,
        elapsedMs: Date.now() - startedAt,
      });
    } catch (error) {
      logError(message, error);
    }
  };

  const pump = (): void => {
    while (active < config.maxConcurrentRequests && queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      active += 1;
      void process(item.message).finally(() => {
        active -= 1;
        item.resolve();
        pump();
        resolveIdle();
      });
    }
  };

  const handler = ((message: BotMessage): Promise<void> => {
    if (!isEligibleGuildMessage(message) || !accepting) return Promise.resolve();
    const maxQueuedRequests = config.maxQueuedRequests ?? config.maxConcurrentRequests * 10;
    if (queue.length >= maxQueuedRequests) {
      return message.reply(config.fallbackReply).then(() => undefined).catch((error) => logError(message, error));
    }
    return new Promise((resolve) => {
      queue.push({ message, resolve });
      pump();
    });
  }) as MessageHandler;

  handler.stop = (): void => {
    accepting = false;
    while (queue.length) queue.shift()?.resolve();
    resolveIdle();
  };

  handler.waitForIdle = (): Promise<void> => {
    if (active === 0 && queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
  };

  return handler;
}
