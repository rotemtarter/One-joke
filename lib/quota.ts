import "server-only";
import { createClient } from "@/lib/supabase/server";

export { DAILY_LIMIT } from "./quota-limits";

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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type Reservation =
  | { status: "OK"; reservationId: string; remainingToday: number }
  | { status: "DEVICE_LIMIT" | "SITE_LIMIT" };

// Takes a slot from the device's quota and the site cap, atomically (ARCHITECTURE 5.2).
// Throws when the database cannot be reached.
export async function reserveJoke(supabase: SupabaseClient): Promise<Reservation> {
  const { data, error } = await supabase
    .rpc("reserve_joke_generation")
    .single<{ status: string; reservation_id: string | null; remaining_today: number }>();

  if (error || !data) {
    throw new Error(`reserve_joke_generation failed (${error?.code ?? "no data"}).`);
  }
  if (data.status === "OK" && data.reservation_id) {
    return {
      status: "OK",
      reservationId: data.reservation_id,
      remainingToday: data.remaining_today,
    };
  }
  if (data.status === "DEVICE_LIMIT" || data.status === "SITE_LIMIT") {
    return { status: data.status };
  }
  throw new Error(`reserve_joke_generation returned an unknown status.`);
}

// The joke was delivered: the reservation stays counted.
export async function completeJoke(supabase: SupabaseClient, reservationId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_joke_generation", {
    reservation_id: reservationId,
  });
  if (error) throw new Error(`complete_joke_generation failed (${error.code}).`);
}

// The attempt failed: give the slot back, so it is not counted.
export async function releaseJoke(supabase: SupabaseClient, reservationId: string): Promise<void> {
  const { error } = await supabase.rpc("release_joke_generation", {
    reservation_id: reservationId,
  });
  if (error) throw new Error(`release_joke_generation failed (${error.code}).`);
}
