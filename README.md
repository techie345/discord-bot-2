# Discord Ollama Bot

A TypeScript Discord bot that sends each human-authored server message to an Ollama model and replies with the generated response. It ignores DMs, bot messages, webhook messages, and blank messages. Each request contains only the triggering message, so no conversation history is stored.

## Requirements

- Node.js 24 LTS for local execution
- A Discord application and bot token
- An Ollama model available through an authenticated HTTPS endpoint reachable from the bot host

## Discord Setup

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create its bot user and copy the token into `.env`.
3. On the Bot page, enable **Message Content Intent**.
4. Invite the bot with the `bot` scope and these channel permissions: View Channel, Read Message History, and Send Messages.

Every eligible server message invokes Ollama, so a busy server can create significant model load. Use `MAX_CONCURRENT_REQUESTS` to protect the Ollama host.

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
