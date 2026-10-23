import { afterAll, describe, expect, it } from "vitest";
import {
  actAsAdmin,
  actAsDevice,
  counts,
  createUsers,
  pool,
  reserveAs,
  withRollback,
  type Client,
  type Reservation,
} from "./db";

afterAll(() => pool.end());

async function israelToday(client: Client): Promise<string> {
  const { rows } = await client.query<{ today: string }>(
    "select private.israel_date(now())::text as today",
  );
  return rows[0].today;
}

async function reserve(client: Client): Promise<Reservation> {
  const { rows } = await client.query<Reservation>("select * from public.reserve_joke_generation()");
  return rows[0];
}

async function quotaStatus(client: Client) {
  const { rows } = await client.query<{ remaining_today: number; site_limit_reached: boolean }>(
    "select * from public.get_quota_status()",
  );
  return rows[0];
}

async function release(client: Client, id: string): Promise<boolean> {
  const { rows } = await client.query<{ ok: boolean }>(
    "select public.release_joke_generation($1) as ok",
    [id],
  );
  return rows[0].ok;
}

async function complete(client: Client, id: string): Promise<boolean> {
  const { rows } = await client.query<{ ok: boolean }>(
    "select public.complete_joke_generation($1) as ok",
    [id],
  );
  return rows[0].ok;
}

// Fills the site cap for a date: 30 devices x 10 reservations, in one statement.
async function fillSite(client: Client, date: string): Promise<{ ok: number; users: string[] }> {
  const users = await createUsers(client, 30);
  // Each device appears 10 times in the list: one call per row. (A cross join with
  // generate_series would let Postgres call the function only once per device.)
  const calls = users.flatMap((user) => Array<string>(10).fill(user));
  const { rows } = await client.query<{ ok: number }>(
    `select count(*) filter (where r.status = 'OK')::int as ok
       from unnest($1::uuid[]) as u(id)
       cross join lateral private.reserve_for(u.id, $2::date) r`,
    [calls, date],
  );
  return { ok: rows[0].ok, users };
}

describe("device quota (10 a day)", () => {
  it("approves the first 10 reservations of the day and rejects the 11th", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      const today = await israelToday(client);

      await actAsDevice(client, device);
      const results: Reservation[] = [];
      for (let i = 0; i < 11; i++) results.push(await reserve(client));

      expect(results.slice(0, 10).map((r) => r.status)).toEqual(Array(10).fill("OK"));
      expect(results.slice(0, 10).map((r) => r.remaining_today)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
      expect(results[10]).toEqual({ status: "DEVICE_LIMIT", reservation_id: null, remaining_today: 0 });

      await actAsAdmin(client);
      const { rows } = await client.query(
        "select usage_date::text as day, status from public.generation_reservations where user_id = $1",
        [device],
      );
      expect(rows).toHaveLength(10);
      expect(rows.every((row) => row.day === today && row.status === "pending")).toBe(true);
      expect((await counts(client, device, today)).device).toBe(10);
    });
  });

  it("reports the remaining quota of the device", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      await actAsDevice(client, device);
      expect(await quotaStatus(client)).toEqual({ remaining_today: 10, site_limit_reached: false });
      for (let i = 0; i < 3; i++) await reserve(client);
      expect((await quotaStatus(client)).remaining_today).toBe(7);
    });
  });
});

describe("site cap (300 a day)", () => {
  it("rejects every device after 300 reservations site-wide, even one under 10", async () => {
    await withRollback(async (client) => {
      const today = await israelToday(client);
      const { ok, users } = await fillSite(client, today);
      expect(ok).toBe(300);

      const [newcomer] = await createUsers(client, 1);
      await actAsDevice(client, newcomer);
      expect(await quotaStatus(client)).toEqual({ remaining_today: 10, site_limit_reached: true });
      expect(await reserve(client)).toEqual({ status: "SITE_LIMIT", reservation_id: null, remaining_today: 10 });

      await actAsAdmin(client);
      expect(await counts(client, newcomer, today)).toEqual({ device: 0, site: 300 });
      expect((await reserveAs(client, users[0], today)).status).toBe("DEVICE_LIMIT");
    });
  });
});

describe("Israel calendar day (Asia/Jerusalem)", () => {
  const cases: [string, string, string][] = [
    ["winter, last second of the day", "2026-12-31T21:59:59Z", "2026-12-31"],
    ["winter, midnight", "2026-12-31T22:00:00Z", "2027-01-01"],
    ["summer, last second of the day", "2026-07-01T20:59:59Z", "2026-07-01"],
    ["summer, midnight", "2026-07-01T21:00:00Z", "2026-07-02"],
    ["eve of summer time, last second", "2026-03-26T21:59:59Z", "2026-03-26"],
    ["summer time starts (02:00 -> 03:00)", "2026-03-27T00:30:00Z", "2026-03-27"],
    ["first summer-time midnight", "2026-03-27T21:00:00Z", "2026-03-28"],
    ["eve of winter time, last second", "2026-10-24T20:59:59Z", "2026-10-24"],
    ["winter time starts (02:00 -> 01:00)", "2026-10-24T23:30:00Z", "2026-10-25"],
    ["first winter-time midnight, last second", "2026-10-25T21:59:59Z", "2026-10-25"],
    ["first winter-time midnight", "2026-10-25T22:00:00Z", "2026-10-26"],
  ];

  it.each(cases)("%s", async (_label, utc, expected) => {
    const { rows } = await pool.query<{ day: string }>(
      "select private.israel_date($1::timestamptz)::text as day",
      [utc],
    );
    expect(rows[0].day).toBe(expected);
  });

  it("gives a device a fresh quota on the next day", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      for (let i = 0; i < 10; i++) await reserveAs(client, device, "2099-06-01");
      expect((await reserveAs(client, device, "2099-06-01")).status).toBe("DEVICE_LIMIT");
      expect(await reserveAs(client, device, "2099-06-02")).toMatchObject({ status: "OK", remaining_today: 9 });
    });
  });

  it("lifts the site cap on the next day", async () => {
    await withRollback(async (client) => {
      await fillSite(client, "2099-06-01");
      const [device] = await createUsers(client, 1);
      expect((await reserveAs(client, device, "2099-06-01")).status).toBe("SITE_LIMIT");
      expect((await reserveAs(client, device, "2099-06-02")).status).toBe("OK");
    });
  });
});

describe("release and complete", () => {
  it("returns the slot once, to both the device quota and the site cap", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      const today = await israelToday(client);
      await actAsDevice(client, device);
      const { reservation_id } = await reserve(client);

      await actAsAdmin(client);
      const before = await counts(client, device, today);
      await actAsDevice(client, device);
      expect(await release(client, reservation_id!)).toBe(true);
      expect(await release(client, reservation_id!)).toBe(false);

      await actAsAdmin(client);
      expect(await counts(client, device, today)).toEqual({
        device: before.device - 1,
        site: before.site - 1,
      });
    });
  });

  it("does not touch a completed reservation", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      const today = await israelToday(client);
      await actAsDevice(client, device);
      const { reservation_id } = await reserve(client);
      expect(await complete(client, reservation_id!)).toBe(true);
      expect(await complete(client, reservation_id!)).toBe(false);
      expect(await release(client, reservation_id!)).toBe(false);

      await actAsAdmin(client);
      expect((await counts(client, device, today)).device).toBe(1);
    });
  });

  it("releases to the day the reservation was made, not to today", async () => {
    await withRollback(async (client) => {
      const [device] = await createUsers(client, 1);
      const earlier = await reserveAs(client, device, "2099-06-01");
      await reserveAs(client, device, "2099-06-02");

      await actAsDevice(client, device);
      expect(await release(client, earlier.reservation_id!)).toBe(true);

      await actAsAdmin(client);
      expect(await counts(client, device, "2099-06-01")).toEqual({ device: 0, site: 0 });
      expect(await counts(client, device, "2099-06-02")).toEqual({ device: 1, site: 1 });
    });
  });

  it("ignores another device's reservation", async () => {
    await withRollback(async (client) => {
      const [owner, other] = await createUsers(client, 2);
      const reservation = await reserveAs(client, owner, "2099-06-01");

      await actAsDevice(client, other);
      expect(await release(client, reservation.reservation_id!)).toBe(false);
      expect(await complete(client, reservation.reservation_id!)).toBe(false);

      await actAsAdmin(client);
      expect(await counts(client, owner, "2099-06-01")).toEqual({ device: 1, site: 1 });
      const { rows } = await client.query(
        "select status from public.generation_reservations where id = $1",
        [reservation.reservation_id],
      );
      expect(rows[0].status).toBe("pending");
    });
  });
});
