import type { NextRequest } from "next/server";
import type { JokeError, JokeErrorCode, JokeSuccess } from "@/lib/jokes/api-types";
import { parseTopic } from "@/lib/jokes/input";
import { generateJokeText, JokeGenerationError } from "@/lib/jokes/openai";
import { completeJoke, releaseJoke, reserveJoke, type Reservation } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";

// The OpenAI call is capped at ~20 s; leave room to release the reservation (ARCHITECTURE 6.3).
export const maxDuration = 30;

const STATUS: Record<JokeErrorCode, number> = {
  INVALID_INPUT: 400,
  TOPIC_TOO_LONG: 400,
  UNAUTHORIZED: 401,
  DAILY_LIMIT_REACHED: 429,
  SITE_LIMIT_REACHED: 429,
  AI_FAILED: 502,
  AI_TIMEOUT: 504,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

// POST /api/jokes (ARCHITECTURE 6.1–6.2). Logs only a request ID, outcome and duration:
// never the topic, the joke or any key.
export async function POST(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();

  const respond = (code: JokeErrorCode | "OK", body: JokeSuccess | JokeError) => {
    console.log(`[jokes] ${requestId} ${code} ${Date.now() - startedAt}ms`);
    return Response.json(body, { status: code === "OK" ? 200 : STATUS[code] });
  };
  const fail = (code: JokeErrorCode) => respond(code, { error: code });

  try {
    // JSON only: together with SameSite=Lax cookies this blocks cross-site form posts.
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return fail("INVALID_INPUT");
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("INVALID_INPUT");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return fail("INVALID_INPUT");
    }
    const parsed = parseTopic((body as { topic?: unknown }).topic);
    if (!parsed.ok) return fail(parsed.error);

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getClaims();
    if (!auth?.claims) return fail("UNAUTHORIZED");

    let reservation: Reservation;
    try {
      reservation = await reserveJoke(supabase);
    } catch (error) {
      console.error(`[jokes] ${requestId} ${(error as Error).message}`);
      return fail("SERVICE_UNAVAILABLE");
    }
    if (reservation.status !== "OK") {
      return fail(reservation.status === "DEVICE_LIMIT" ? "DAILY_LIMIT_REACHED" : "SITE_LIMIT_REACHED");
    }

    const { reservationId, remainingToday } = reservation;
    let joke: string;
    try {
      joke = await generateJokeText(parsed.topic);
    } catch (error) {
      // Failed attempts are not counted (PRD 4.a.4).
      await releaseJoke(supabase, reservationId).catch((releaseError: Error) =>
        console.error(`[jokes] ${requestId} ${releaseError.message}`),
      );
      if (error instanceof JokeGenerationError) {
        return fail(error.reason === "timeout" ? "AI_TIMEOUT" : "AI_FAILED");
      }
      throw error;
    }

    // The joke was generated and paid for: return it even if marking it fails
    // (the reservation then stays pending and counted, ARCHITECTURE 5.4).
    await completeJoke(supabase, reservationId).catch((completeError: Error) =>
      console.error(`[jokes] ${requestId} ${completeError.message}`),
    );
    return respond("OK", { joke, remainingToday });
  } catch (error) {
    console.error(`[jokes] ${requestId} unexpected ${(error as Error)?.name ?? "error"}`);
    return fail("INTERNAL_ERROR");
  }
}
