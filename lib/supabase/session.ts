import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// HttpOnly: no Supabase client runs in the browser, so scripts never need the token (ADR-10).
// Secure only in production: Safari drops Secure cookies on http://localhost.
export const SUPABASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

// Failures that do not mean the device lost its identity; creating a new anonymous user
// here would hand the device a fresh quota.
function isTransientAuthError(error: AuthError): boolean {
  return (
    isAuthRetryableFetchError(error) ||
    error.code === "refresh_token_already_used" ||
    (error.status ?? 0) >= 500
  );
}

// Verifies or refreshes the anonymous session, creating one when the device has none.
// Reads env directly: lib/config/env.ts is server-only and the proxy is bundled separately.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Write to the request too, so the page rendered for this request sees the new session.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Nothing may run between creating the client and getClaims(), or a refresh can be missed.
  const { data, error } = await supabase.auth.getClaims();
  if (data?.claims) return response;

  if (error && isTransientAuthError(error)) {
    console.warn(`[session] check skipped (${error.code ?? error.status ?? "unknown"}).`);
    return response;
  }

  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    console.error(
      `[session] anonymous sign-in failed (${signInError.code ?? signInError.status ?? "unknown"}).`,
    );
  }
  return response;
}
