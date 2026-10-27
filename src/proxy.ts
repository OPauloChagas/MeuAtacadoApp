import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { identityConfigured, readIdentityConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (identityConfigured()) {
    const settings = readIdentityConfig();
    const client = createServerClient(settings.url, settings.publishableKey, {
      cookieOptions: { name: "atacado-session", httpOnly: true, secure: settings.secure, sameSite: "lax", path: "/" },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    // Refresh and verify; each protected use case still verifies user + current DB membership.
    try { await client.auth.getClaims(); } catch { /* Protected routes fail closed independently. */ }
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  // Native same-origin POSTs need a non-null Origin. Token-bearing confirmation
  // pages alone suppress all referrers; their POST is a Server Action fetch.
  response.headers.set("Referrer-Policy", ["/auth/confirm","/auth/invite"].includes(request.nextUrl.pathname) ? "no-referrer" : "same-origin");
  return response;
}

export const config = {
  matcher: ["/login", "/recuperar-senha", "/definir-senha", "/auth/:path*", "/convites/:path*", "/selecionar-acesso", "/sem-acesso", "/acesso-negado", "/empresa/:path*", "/cliente/:path*", "/api/identity/:path*", "/api/customers/:path*"],
};
