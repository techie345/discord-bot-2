# Discord Ollama Bot

A TypeScript Discord bot with a user-installed message context command that sends a selected server message to an Ollama model and posts the generated response. Each request contains only the selected message, so no conversation history is stored.

## Requirements

- Node.js 24 LTS for local execution
- A Discord application and bot token
- An Ollama model available through an authenticated HTTPS endpoint reachable from the bot host

## Discord Setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create its bot user and copy the token into `.env`.
3. Enable the **User Install** installation context for the application.
4. Add the `applications.commands` scope to the installation link and install the app for your user.

After installation, right-click a human-authored server message, open **Apps**, and choose **Ask Ollama**. The command is registered globally and may take time to appear after the bot first connects. Use `MAX_CONCURRENT_REQUESTS` and `MAX_QUEUED_REQUESTS` to protect the Ollama host.

## Configuration

```bash
cp .env.example .env
```

Set `DISCORD_TOKEN`, `OLLAMA_HOST` (for example, `https://ollama.example.lan`), and `OLLAMA_API_KEY`. Set `OLLAMA_MODEL` to a model available on the Ollama server. The host must use HTTPS; the API key is sent as a bearer token and is never logged.

## Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

## Docker

The image contains only the bot. Ollama remains on its existing LAN server, and no inbound ports are required.

```bash
docker build -t discord-ollama-bot .
docker run --rm --env-file .env discord-ollama-bot
```

The image uses a multi-stage Node.js 24 slim build and runs as the non-root `node` user. Secrets are supplied at runtime and are not copied into the image.
