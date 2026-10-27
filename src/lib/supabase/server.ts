import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readIdentityConfig } from "./config";

export async function createAuthClient(writable = false) {
  const config = readIdentityConfig();
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: { name: "atacado-session", httpOnly: true, secure: config.secure, sameSite: "lax", path: "/" },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => store.getAll(),
      ...(writable ? { setAll: (values: { name: string; value: string; options: import("@supabase/ssr").CookieOptions }[]) => {
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      } } : {}),
    },
  });
}
