export interface MessageLike {
  guildId: string | null;
  author: { bot: boolean };
  webhookId: string | null;
  content: string;
}

export function isEligibleGuildMessage(message: MessageLike): boolean {
  return Boolean(
    message.guildId && !message.author.bot && !message.webhookId && message.content.trim(),
  );
}

export function splitDiscordMessage(content: string, limit = 2000): string[] {
  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n', limit);
    if (cut <= 0) cut = remaining.lastIndexOf(' ', limit);
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\s+/, '');
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
