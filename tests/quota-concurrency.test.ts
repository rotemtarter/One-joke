import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUsers, pool } from "./db";

// Parallel calls need committed data on separate connections, so this file cannot use
// withRollback. It works on far-future dates and deletes everything it created.
const DEVICE_DAY = "2099-01-01";
const SITE_DAY = "2099-01-02";
let users: string[] = [];

async function cleanUp() {
  await pool.query("delete from public.site_daily_usage where usage_date = any($1::date[])", [
    [DEVICE_DAY, SITE_DAY],
  ]);
  if (users.length > 0) {
    // Cascades to daily_usage and generation_reservations.
    await pool.query("delete from auth.users where id = any($1::uuid[])", [users]);
  }
}

async function reserveInParallel(calls: { user: string; day: string }[]): Promise<string[]> {
  const results = await Promise.all(
    calls.map(({ user, day }) =>
      pool.query<{ status: string }>("select status from private.reserve_for($1, $2::date)", [user, day]),
    ),
  );
  return results.map((result) => result.rows[0].status);
}

beforeAll(async () => {
  await cleanUp();
  users = await createUsers(pool, 36);
});

afterAll(async () => {
  await cleanUp();
  await pool.end();
});

describe("parallel requests", () => {
  it("never let one device exceed 10", async () => {
    const statuses = await reserveInParallel(
      Array.from({ length: 25 }, () => ({ user: users[0], day: DEVICE_DAY })),
    );
    expect(statuses.filter((s) => s === "OK")).toHaveLength(10);
    expect(statuses.filter((s) => s === "DEVICE_LIMIT")).toHaveLength(15);

    const { rows } = await pool.query(
      "select count from public.daily_usage where user_id = $1 and usage_date = $2",
      [users[0], DEVICE_DAY],
    );
    expect(rows[0].count).toBe(10);
  });

  it("never let the site exceed 300", async () => {
    // 35 devices x 10 = 350 requests for 300 slots.
    const calls = users
      .slice(1)
      .flatMap((user) => Array.from({ length: 10 }, () => ({ user, day: SITE_DAY })));
    const statuses = await reserveInParallel(calls);
    expect(statuses.filter((s) => s === "OK")).toHaveLength(300);
    expect(statuses.filter((s) => s === "SITE_LIMIT")).toHaveLength(50);

    const { rows } = await pool.query<{ site: number; devices: number; reservations: number }>(
      `select
         (select count from public.site_daily_usage where usage_date = $1) as site,
         (select sum(count)::int from public.daily_usage where usage_date = $1) as devices,
         (select count(*)::int from public.generation_reservations where usage_date = $1) as reservations`,
      [SITE_DAY],
    );
    expect(rows[0]).toEqual({ site: 300, devices: 300, reservations: 300 });
  });
});
