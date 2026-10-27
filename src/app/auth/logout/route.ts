import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clearContext } from "@/modules/identity/session";
import { accessError, navigate, verifyOrigin } from "@/modules/identity/http";

export async function POST(request: NextRequest) {
  try {
    verifyOrigin(request);
    const client = await createAuthClient(true);
    await client.auth.signOut({ scope: "local" });
    const store = await cookies();
    store.getAll().filter(({ name }) => name.startsWith("atacado-session")).forEach(({ name }) => store.delete(name));
    await clearContext();
    return navigate("/login");
  } catch (error) { return accessError(error); }
}
