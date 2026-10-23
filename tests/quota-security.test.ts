import { afterAll, describe, expect, it } from "vitest";
import {
  actAsAdmin,
  actAsDevice,
  actAsNoSession,
  createUsers,
  errorCode,
  pool,
  reserveAs,
  withRollback,
} from "./db";

afterAll(() => pool.end());

const PERMISSION_DENIED = "42501";

describe("a device cannot choose the date or the device", () => {
  it("public functions take no user or date parameters", async () => {
    const { rows } = await pool.query<{ name: string; args: string }>(
      `select p.proname as name, pg_get_function_identity_arguments(p.oid) as args
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('reserve_joke_generation', 'complete_joke_generation',
                            'release_joke_generation', 'get_quota_status')
        order by p.proname`,
    );
    expect(rows).toEqual([
      { name: "complete_joke_generation", args: "reservation_id uuid" },
      { name: "get_quota_status", args: "" },
      { name: "release_joke_generation", args: "reservation_id uuid" },
      { name: "reserve_joke_generation", args: "" },
    ]);
  });

  it("the private functions that take a user and a date are off limits", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      await actAsDevice(client, device);
      expect(
        await errorCode(client, "select * from private.reserve_for($1, '2099-01-01'::date)", [device]),
      ).toBe(PERMISSION_DENIED);
      expect(await errorCode(client, "select private.israel_date(now())")).toBe(PERMISSION_DENIED);
    });
  });
});

describe("quota tables are read-only for devices", () => {
  it("rejects direct writes to every quota table", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      await actAsDevice(client, device);
      const statements = [
        "insert into public.daily_usage (user_id, usage_date, count) values (auth.uid(), current_date, 0)",
        "update public.daily_usage set count = 0",
        "delete from public.daily_usage",
        "insert into public.site_daily_usage (usage_date, count) values (current_date, 0)",
        "update public.site_daily_usage set count = 0",
        "insert into public.generation_reservations (user_id, usage_date) values (auth.uid(), current_date)",
        "update public.generation_reservations set status = 'pending'",
      ];
      for (const sql of statements) {
        expect(await errorCode(client, sql), sql).toBe(PERMISSION_DENIED);
      }
    });
  });

  it("lets a device read only its own usage rows", async () => {
    await withRollback(async (client) => {
      const [mine, theirs] = await createUsers(client, 2);
      await reserveAs(client, mine, "2099-01-01");
      await reserveAs(client, theirs, "2099-01-01");

      await actAsDevice(client, mine);
      const { rows } = await client.query("select user_id from public.daily_usage");
      expect(rows).toEqual([{ user_id: mine }]);
      expect(await errorCode(client, "select * from public.site_daily_usage")).toBe(PERMISSION_DENIED);
      expect(await errorCode(client, "select * from public.generation_reservations")).toBe(
        PERMISSION_DENIED,
      );
    });
  });
});

describe("no session", () => {
  const calls = [
    "select * from public.reserve_joke_generation()",
    "select public.complete_joke_generation(gen_random_uuid())",
    "select public.release_joke_generation(gen_random_uuid())",
    "select * from public.get_quota_status()",
  ];

  it("the public key alone cannot call the quota functions", async () => {
    await withRollback(async (client) => {
      await actAsNoSession(client);
      for (const sql of calls) {
        expect(await errorCode(client, sql), sql).toBe(PERMISSION_DENIED);
      }
    });
  });

  it("a signed-in role without a device id is rejected", async () => {
    await withRollback(async (client) => {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ role: "authenticated" }),
      ]);
      for (const sql of calls) {
        expect(await errorCode(client, sql), sql).toBe("28000");
      }
      await actAsAdmin(client);
    });
  });
});
