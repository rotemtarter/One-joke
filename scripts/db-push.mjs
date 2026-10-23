// Applies supabase/migrations to the DEVELOPMENT database (ADR-11).
// Reads SUPABASE_DB_URL from .env and never prints it. Production uses the GitHub workflow.
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: the check below explains what is missing.
}

const dbUrl = process.env.SUPABASE_DB_URL?.trim();
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is missing in .env (see docs/setup-guide.md).");
  process.exit(1);
}

const args = ["supabase", "db", "push", "--db-url", dbUrl, ...process.argv.slice(2)];
const result = spawnSync("npx", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
