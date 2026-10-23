import pg from "pg";

// Tests run against the Supabase DEVELOPMENT database only (ADR-11).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: the check below explains what is missing.
}
if (!process.env.SUPABASE_DB_URL?.trim()) {
  throw new Error(
    "SUPABASE_DB_URL is missing. Add the Development connection string to .env " +
      "(see docs/setup-guide.md).",
  );
}

export const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 10,
});

export type Client = pg.PoolClient;

// Runs fn inside a transaction that is always rolled back, so nothing is left behind.
export async function withRollback(fn: (client: Client) => Promise<void>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
  }
}

// Fake devices: bare auth.users rows. Inside withRollback they disappear with the transaction.
export async function createUsers(client: pg.Pool | Client, count: number): Promise<string[]> {
  const { rows } = await client.query<{ id: string }>(
    "insert into auth.users (id) select gen_random_uuid() from generate_series(1, $1) returning id",
    [count],
  );
  return rows.map((row) => row.id);
}

// Acts as the signed-in anonymous device, exactly as Supabase does for API requests.
export async function actAsDevice(client: Client, userId: string): Promise<void> {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated", is_anonymous: true }),
  ]);
}

// Acts as a caller with only the public key and no session.
export async function actAsNoSession(client: Client): Promise<void> {
  await client.query("set local role anon");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ role: "anon" }),
  ]);
}

// Back to the privileged test connection (still inside the same transaction).
export async function actAsAdmin(client: Client): Promise<void> {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

// Runs a statement expected to fail; returns the Postgres error code, keeping the transaction usable.
export async function errorCode(client: Client, sql: string, params: unknown[] = []) {
  await client.query("savepoint expect_error");
  try {
    await client.query(sql, params);
    await client.query("release savepoint expect_error");
    return null;
  } catch (error) {
    await client.query("rollback to savepoint expect_error");
    return (error as { code?: string }).code ?? "unknown";
  }
}

export type Reservation = { status: string; reservation_id: string | null; remaining_today: number };

export async function reserveAs(client: Client, userId: string, date: string) {
  const { rows } = await client.query<Reservation>(
    "select * from private.reserve_for($1, $2::date)",
    [userId, date],
  );
  return rows[0];
}

export async function counts(client: Client, userId: string, date: string) {
  const { rows } = await client.query<{ device: number | null; site: number | null }>(
    `select
       (select count from public.daily_usage where user_id = $1 and usage_date = $2::date) as device,
       (select count from public.site_daily_usage where usage_date = $2::date) as site`,
    [userId, date],
  );
  return { device: rows[0].device ?? 0, site: rows[0].site ?? 0 };
}
