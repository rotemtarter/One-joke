import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Gives every device an anonymous Supabase session, invisibly (ARCHITECTURE 7.1).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Pages and API routes only; static files never need a session.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|icons/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
