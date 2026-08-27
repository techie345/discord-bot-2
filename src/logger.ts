import pino from 'pino';

export interface LogSink {
  error: (object: Record<string, unknown>, message: string) => void;
  info: (object: Record<string, unknown>, message: string) => void;
  warn: (object: Record<string, unknown>, message: string) => void;
}

const sensitiveKeys = new Set(['authorization', 'apiKey', 'content', 'token']);

function safeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !sensitiveKeys.has(key)));
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) return String(error);
  const result: { name: string; message: string; stack?: string; cause?: unknown } = {
    name: error.name,
    message: error.message,
  };
  if (error.stack) result.stack = error.stack;
  if (error.cause !== undefined) result.cause = serializeError(error.cause);
  return result;
}

export class Logger {
  private readonly sink: LogSink;

  constructor(sink: LogSink = pino()) {
    this.sink = sink;
  }

  info(message: string, metadata: Record<string, unknown> = {}): void {
    this.sink.info(safeMetadata(metadata), message);
  }

  warn(message: string, metadata: Record<string, unknown> = {}): void {
    this.sink.warn(safeMetadata(metadata), message);
  }

  error(message: string, error?: unknown, metadata: Record<string, unknown> = {}): void {
    const fields = safeMetadata(metadata);
    if (error !== undefined) fields.err = serializeError(error);
    this.sink.error(fields, message);
  }
}
