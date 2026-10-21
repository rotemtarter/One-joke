// Runs once when the server starts: validates configuration before serving requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupChecks } = await import("@/lib/config/startup-checks");
    await runStartupChecks();
  }
}
