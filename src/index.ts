import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { Ollama } from 'ollama';
import { createMessageHandler } from './bot.js';
import { loadConfig } from './config.js';
import { createOllamaResponder } from './ollama-responder.js';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const ollama = new Ollama({
    host: config.ollamaHost,
    headers: { Authorization: `Bearer ${config.ollamaApiKey}` },
  });
  const responder = createOllamaResponder(ollama, config);
  const handler = createMessageHandler({ responder, config, logger: console });
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
  });
  client.on(Events.MessageCreate, (message) => {
    void handler(message);
  });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    handler.stop();
    await Promise.race([
      handler.waitForIdle(),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);
    client.destroy();
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  await client.login(config.discordToken);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unable to start bot: ${message}`);
  process.exitCode = 1;
});
