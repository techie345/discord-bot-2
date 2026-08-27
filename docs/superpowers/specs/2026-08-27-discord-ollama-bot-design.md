# Discord Ollama Reply Bot Design

## Goal

Build a TypeScript Discord bot that generates an AI reply for every human-authored message in server channels using an Ollama instance exposed through an authenticated HTTPS endpoint on the local network.

## Decisions

- Use Node.js 24 LTS.
- Use `discord.js` for Discord Gateway and message APIs.
- Use the official `ollama` JavaScript/TypeScript client for model requests.
- Process guild messages only. Direct messages are ignored.
- Ignore messages authored by bots or webhooks to prevent reply loops.
- Send only the current message to Ollama; do not persist conversation history.
- Configure secrets and deployment settings with environment variables.
- Run as one process with no database or web server.

## Architecture

`src/config.ts` validates required environment variables and exposes typed settings. `src/ollama.ts` owns the Ollama client and converts a message into a single chat request. `src/bot.ts` owns Discord event handling, filtering, typing status, bounded work scheduling, response splitting, and channel replies. `src/index.ts` starts the client, reports startup failures, and handles graceful shutdown.

The event flow is:

1. Discord emits `messageCreate`.
2. The handler ignores bots, webhooks, DMs, and empty content.
3. The message is queued under a small configurable concurrency limit.
4. The bot sends the current message to Ollama over HTTPS with the configured authorization header.
5. The generated response is split into Discord-sized messages when necessary and sent to the originating channel.

The Ollama URL, model, API key, request timeout, concurrency limit, and optional system prompt are configurable. The API key is never logged. Logs contain operational errors and identifiers as needed, but not full user message content.

## Error Handling

Ollama timeouts, connection failures, unavailable models, empty responses, and Discord send failures are caught at the message boundary. A short configurable fallback reply is sent when generation fails, unless Discord itself cannot accept the reply. Individual failures do not terminate the Gateway process. Shutdown stops accepting new work, waits for active handlers within a bounded period, and then destroys the Discord client.

## Testing

Unit tests cover configuration validation, message eligibility, prompt construction, Ollama response extraction, Discord message splitting, concurrency behavior, and fallback replies. Mocked integration tests exercise the Discord message handler with fake Discord messages and an injected Ollama client. Tests do not require Discord credentials or a running Ollama server.

## Documentation and Setup

The README will document Node.js installation, dependency installation, Discord application creation, enabling the privileged Message Content intent, required bot permissions, Ollama HTTPS and authentication configuration, model availability, environment setup, test execution, and production launch.

## Success Criteria

- A configured bot logs in successfully and responds to each eligible server message.
- No response is generated for DMs, bot messages, webhook messages, or blank content.
- The response uses only the triggering message as model input.
- Messages longer than Discord's content limit are delivered in ordered chunks.
- Ollama and Discord failures are isolated to the affected message and observable in safe logs.
- The project type-checks and tests without external service credentials.
