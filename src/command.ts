import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  Routes,
} from 'discord.js';
import type { AppConfig } from './config.js';
import { createMessageHandler } from './bot.js';
import { isEligibleGuildMessage } from './message-utils.js';

interface CommandTargetMessage {
  id: string;
  guildId: string | null;
  author: { bot: boolean };
  webhookId: string | null;
  content: string;
  channel: { sendTyping?: () => Promise<unknown> };
}

export interface MessageCommandInteraction {
  isMessageContextMenuCommand: () => boolean;
  commandName: string;
  guildId: string | null;
  targetMessage: CommandTargetMessage;
  deferReply: () => Promise<unknown>;
  editReply: (content: string) => Promise<unknown>;
  followUp: (content: string) => Promise<unknown>;
}

export interface MessageCommandHandler {
  (interaction: MessageCommandInteraction): Promise<void>;
  stop: () => void;
  waitForIdle: () => Promise<void>;
}

interface CommandDependencies {
  responder: (content: string) => Promise<string>;
  config: Pick<AppConfig, 'maxConcurrentRequests' | 'fallbackReply'>;
  logger: Parameters<typeof createMessageHandler>[0]['logger'];
}

interface CommandRegistrar {
  setToken: (token: string) => CommandRegistrar;
  put: (route: `/${string}`, body: { body: ReturnType<typeof createAskOllamaCommand>[] }) => Promise<unknown>;
}

export function createAskOllamaCommand(): ReturnType<ContextMenuCommandBuilder['toJSON']> {
  return new ContextMenuCommandBuilder()
    .setName('Ask Ollama')
    .setType(ApplicationCommandType.Message)
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild)
    .toJSON();
}

export function registerMessageCommand(
  rest: CommandRegistrar,
  applicationId: string,
  token: string,
): Promise<unknown> {
  return rest.setToken(token).put(Routes.applicationCommands(applicationId), {
    body: [createAskOllamaCommand()],
  });
}

export function createMessageCommandHandler({ responder, config, logger }: CommandDependencies): MessageCommandHandler {
  const responseHandler = createMessageHandler({ responder, config, logger });

  const handler = (async (interaction: MessageCommandInteraction): Promise<void> => {
    if (!interaction.isMessageContextMenuCommand() || interaction.commandName !== 'Ask Ollama') return;

    try {
      await interaction.deferReply();
    } catch (error) {
      logger.error('Unable to acknowledge message command', error, { guildId: interaction.guildId });
      return;
    }

    const target = { ...interaction.targetMessage, guildId: interaction.guildId };
    if (!isEligibleGuildMessage(target)) {
      try {
        await interaction.editReply('I can only process non-empty human messages.');
      } catch (error) {
        logger.error('Unable to send message command validation response', error, {
          guildId: interaction.guildId,
        });
      }
      return;
    }

    let firstReply = true;
    await responseHandler({
      ...target,
      guildId: interaction.guildId,
      reply: async (content: string): Promise<unknown> => {
        if (firstReply) {
          firstReply = false;
          return interaction.editReply(content);
        }
        return interaction.followUp(content);
      },
    });
  }) as MessageCommandHandler;

  handler.stop = responseHandler.stop;
  handler.waitForIdle = responseHandler.waitForIdle;
  return handler;
}
