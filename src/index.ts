import { config as loadDotenv } from 'dotenv';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { Ollama } from 'ollama';
import { createMessageCommandHandler, registerMessageCommand } from './command.js';
import { loadConfig } from './config.js';
import { createOllamaResponder } from './ollama-responder.js';
import { Logger } from './logger.js';

loadDotenv({ override: true });

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const logger = new Logger();
  const ollama = new Ollama({
    host: config.ollamaHost,
    ...(config.ollamaApiKey
      ? { headers: { Authorization: `Bearer ${config.ollamaApiKey}` } }
      : {}),
  });
  const responder = createOllamaResponder(ollama, config, logger);
  const commandHandler = createMessageCommandHandler({ responder, config, logger });
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    void registerMessageCommand(new REST({ version: '10' }), readyClient.user.id, config.discordToken)
      .then(() => logger.info('Registered user-installed message command'))
      .catch((error: unknown) => logger.error('Unable to register message command', error));
  });
  client.on(Events.InteractionCreate, (interaction) => {
    void commandHandler(interaction as never);
  });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    commandHandler.stop();
    await Promise.race([
      commandHandler.waitForIdle(),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);
    client.destroy();
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  await client.login(config.discordToken);
}

main().catch((error: unknown) => {
  new Logger().error('Unable to start bot', error);
  process.exitCode = 1;
});
