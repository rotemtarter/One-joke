// Contract of POST /api/jokes (ARCHITECTURE 6.1), shared by the route and the client.

export type JokeSuccess = {
  joke: string;
  remainingToday: number;
};

export type JokeErrorCode =
  | "INVALID_INPUT"
  | "TOPIC_TOO_LONG"
  | "UNAUTHORIZED"
  | "DAILY_LIMIT_REACHED"
  | "SITE_LIMIT_REACHED"
  | "AI_FAILED"
  | "AI_TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type JokeError = {
  error: JokeErrorCode;
};
