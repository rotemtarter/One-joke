import "server-only";
import { createClient } from "@/lib/supabase/server";

// Display only; the limit itself is enforced in the database (ARCHITECTURE 5.2).
export const DAILY_LIMIT = 10;

export type QuotaStatus = {
  remainingToday: number;
  siteLimitReached: boolean;
};

// The device's quota for today in Israel, or null when it cannot be read.
export async function getQuotaStatus(): Promise<QuotaStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_quota_status")
    .single<{ remaining_today: number; site_limit_reached: boolean }>();

  if (error || !data) {
    console.error(`[quota] status unavailable (${error?.code ?? "no data"}).`);
    return null;
  }
  return { remainingToday: data.remaining_today, siteLimitReached: data.site_limit_reached };
}
