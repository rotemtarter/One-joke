import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// POST /api/jokes with a mocked Supabase session and mocked OpenAI: no network, no cost.

const RESERVATION_ID = "11111111-2222-3333-4444-555555555555";
const OPENAI_KEY = "sk-test-secret-key";

const supabase = {
  auth: { getClaims: vi.fn() },
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase }));

const generateJokeText = vi.fn();
vi.mock("@/lib/jokes/openai", async () => {
  const actual = await vi.importActual<typeof import("@/lib/jokes/openai")>("@/lib/jokes/openai");
  return { ...actual, generateJokeText: (topic: string) => generateJokeText(topic) };
});

const { POST } = await import("@/app/api/jokes/route");
const { JokeGenerationError } = await import("@/lib/jokes/openai");

type Reserve = { status: string; reservation_id: string | null; remaining_today: number };

// rpc(name) returns a thenable query; reserve is read with .single().
function mockDatabase({
  reserve = { status: "OK", reservation_id: RESERVATION_ID, remaining_today: 7 } as Reserve,
  reserveError = null as { code: string } | null,
  completeError = null as { code: string } | null,
} = {}) {
  supabase.rpc.mockImplementation((name: string) => {
    if (name === "reserve_joke_generation") {
      return { single: async () => ({ data: reserveError ? null : reserve, error: reserveError }) };
    }
    if (name === "complete_joke_generation") return Promise.resolve({ error: completeError });
    if (name === "release_joke_generation") return Promise.resolve({ error: null });
    throw new Error(`unexpected rpc ${name}`);
  });
}

function rpcCalls(name: string) {
  return supabase.rpc.mock.calls.filter(([called]) => called === name);
}

function post(body: unknown, contentType = "application/json") {
  return POST(
    new NextRequest("http://localhost:3000/api/jokes", {
      method: "POST",
      headers: { "content-type": contentType },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.OPENAI_API_KEY = OPENAI_KEY;
  supabase.auth.getClaims.mockResolvedValue({ data: { claims: { sub: "device" } }, error: null });
  mockDatabase();
  generateJokeText.mockResolvedValue("חתול נכנס לבר...\nוביקש חלב.");
});

describe("POST /api/jokes", () => {
  it("returns a joke for a topic and marks the reservation as succeeded", async () => {
    const response = await post({ topic: "  חתולים  " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      joke: "חתול נכנס לבר...\nוביקש חלב.",
      remainingToday: 7,
    });
    expect(generateJokeText).toHaveBeenCalledWith("חתולים");
    expect(rpcCalls("complete_joke_generation")).toEqual([
      ["complete_joke_generation", { reservation_id: RESERVATION_ID }],
    ]);
    expect(rpcCalls("release_joke_generation")).toHaveLength(0);
  });

  it("asks for a general joke when the topic is empty or missing", async () => {
    expect((await post({ topic: "" })).status).toBe(200);
    expect((await post({})).status).toBe(200);
    expect(generateJokeText.mock.calls).toEqual([[""], [""]]);
  });

  it.each([
    ["a 101-character topic", { topic: "א".repeat(101) }, "application/json", "TOPIC_TOO_LONG"],
    ["a non-string topic", { topic: 42 }, "application/json", "INVALID_INPUT"],
    ["broken JSON", "{topic", "application/json", "INVALID_INPUT"],
    ["a JSON array", [], "application/json", "INVALID_INPUT"],
    ["a form post", "topic=x", "application/x-www-form-urlencoded", "INVALID_INPUT"],
  ])("rejects %s with 400, before any reservation", async (_label, body, contentType, code) => {
    const response = await post(body, contentType);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: code });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(generateJokeText).not.toHaveBeenCalled();
  });

  it("accepts a topic of exactly 100 characters", async () => {
    expect((await post({ topic: "א".repeat(100) })).status).toBe(200);
  });

  it("returns 401 without a session, and never reserves or calls OpenAI", async () => {
    supabase.auth.getClaims.mockResolvedValue({ data: null, error: { code: "no_session" } });

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(generateJokeText).not.toHaveBeenCalled();
  });

  it.each([
    ["DEVICE_LIMIT", "DAILY_LIMIT_REACHED"],
    ["SITE_LIMIT", "SITE_LIMIT_REACHED"],
  ])("returns 429 on %s without calling OpenAI", async (status, code) => {
    mockDatabase({ reserve: { status, reservation_id: null, remaining_today: 0 } });

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: code });
    expect(generateJokeText).not.toHaveBeenCalled();
  });

  it.each([
    ["failed", 502, "AI_FAILED"],
    ["timeout", 504, "AI_TIMEOUT"],
  ] as const)("releases the reservation when OpenAI %s", async (reason, status, code) => {
    generateJokeText.mockRejectedValue(new JokeGenerationError(reason));

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
    expect(rpcCalls("release_joke_generation")).toEqual([
      ["release_joke_generation", { reservation_id: RESERVATION_ID }],
    ]);
    expect(rpcCalls("complete_joke_generation")).toHaveLength(0);
  });

  it("releases the reservation on an unexpected error too", async () => {
    generateJokeText.mockRejectedValue(new Error("boom"));

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(rpcCalls("release_joke_generation")).toHaveLength(1);
  });

  it("returns 503 when the database cannot reserve, without calling OpenAI", async () => {
    mockDatabase({ reserveError: { code: "PGRST000" } });

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
    expect(generateJokeText).not.toHaveBeenCalled();
  });

  it("still returns the joke when marking it as succeeded fails", async () => {
    mockDatabase({ completeError: { code: "08006" } });

    const response = await post({ topic: "חתולים" });

    expect(response.status).toBe(200);
    expect((await response.json()).joke).toContain("חתול");
  });

  it("never exposes the OpenAI key or the reservation ID", async () => {
    const bodies = [];
    bodies.push(await (await post({ topic: "חתולים" })).text());
    generateJokeText.mockRejectedValue(new JokeGenerationError("failed"));
    bodies.push(await (await post({ topic: "חתולים" })).text());

    for (const body of bodies) {
      expect(body).not.toContain(OPENAI_KEY);
      expect(body).not.toContain(RESERVATION_ID);
    }
  });
});
