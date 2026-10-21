import "server-only";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

export type ServerEnv = Record<RequiredVar, string>;

// Reads required env vars; throws listing only the missing names, never values.
export function getServerEnv(): ServerEnv {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Fill them in .env (see .env.example and docs/setup-guide.md).",
    );
  }
  return Object.fromEntries(
    REQUIRED_VARS.map((name) => [name, process.env[name]!.trim()]),
  ) as ServerEnv;
}
