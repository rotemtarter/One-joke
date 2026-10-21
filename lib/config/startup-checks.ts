import "server-only";
import OpenAI, { APIConnectionError } from "openai";
import { getServerEnv, type ServerEnv } from "./env";

const CHECK_TIMEOUT_MS = 10_000;

// Thrown for configuration problems that must stop the server.
export class StartupCheckError extends Error {
  name = "StartupCheckError";
}

function isNetworkError(error: unknown): boolean {
  return (
    error instanceof APIConnectionError ||
    (error instanceof TypeError && error.message.includes("fetch failed")) ||
    (error instanceof DOMException && error.name === "TimeoutError")
  );
}

// PRD 4.a.3: main GPT-5 only, not the mini/nano variants.
function checkModelId(model: string): void {
  if (!model.startsWith("gpt-5") || /(^|-)(mini|nano)(-|$)/.test(model)) {
    throw new StartupCheckError(
      `OPENAI_MODEL "${model}" is not the main GPT-5 model (mini/nano are not allowed).`,
    );
  }
}

async function checkOpenAIModel(env: ServerEnv): Promise<void> {
  const model = env.OPENAI_MODEL;
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: CHECK_TIMEOUT_MS,
    maxRetries: 0,
  });
  try {
    await client.models.retrieve(model);
  } catch (error) {
    // Only a rejected key or a missing model stops the server; anything else is transient.
    if (error instanceof OpenAI.AuthenticationError) {
      throw new StartupCheckError("OPENAI_API_KEY was rejected by OpenAI.");
    }
    if (error instanceof OpenAI.NotFoundError) {
      throw new StartupCheckError(
        `Model "${model}" is not available for this OpenAI API key.`,
      );
    }
    const reason = isNetworkError(error)
      ? "network unavailable"
      : `status ${error instanceof OpenAI.APIError ? error.status : "unknown"}`;
    console.warn(`[startup] OpenAI check skipped (${reason}).`);
    return;
  }
  console.log(`[startup] OpenAI model OK: ${model}`);
}

async function checkSupabase(env: ServerEnv): Promise<void> {
  let url: URL;
  try {
    url = new URL("/auth/v1/health", env.NEXT_PUBLIC_SUPABASE_URL);
  } catch {
    throw new StartupCheckError("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn("[startup] Supabase check skipped (network unavailable).");
      return;
    }
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    throw new StartupCheckError(
      `Supabase rejected the public key (HTTP ${response.status}). Check NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
    );
  }
  if (!response.ok) {
    console.warn(`[startup] Supabase check skipped (HTTP ${response.status}).`);
    return;
  }
  console.log(`[startup] Supabase reachable: ${url.host}`);
}

export async function runStartupChecks(): Promise<void> {
  const env = getServerEnv();
  checkModelId(env.OPENAI_MODEL);

  // In production, skip calls to external services so a provider hiccup on a cold start
  // cannot take the site down (ADR-3).
  if (process.env.NODE_ENV === "production") return;

  await Promise.all([checkOpenAIModel(env), checkSupabase(env)]);
}
