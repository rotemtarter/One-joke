// Shared by the topic field and the server (PRD 4.a.2). Measured as string length.
export const MAX_TOPIC_LENGTH = 100;

export type TopicResult =
  | { ok: true; topic: string }
  | { ok: false; error: "INVALID_INPUT" | "TOPIC_TOO_LONG" };

// A missing topic means a general joke; anything but a string is rejected.
export function parseTopic(value: unknown): TopicResult {
  if (value === undefined || value === null) return { ok: true, topic: "" };
  if (typeof value !== "string") return { ok: false, error: "INVALID_INPUT" };

  const topic = value.trim();
  if (topic.length > MAX_TOPIC_LENGTH) return { ok: false, error: "TOPIC_TOO_LONG" };
  return { ok: true, topic };
}
