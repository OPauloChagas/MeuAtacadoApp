import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { identityConfigured, readIdentityConfig } from "@/lib/supabase/config";
import { contextCookie, parseContext, uuidPattern, type AccessContext } from "./contracts";

export class AccessFailure extends Error {
  constructor(public readonly status: 401 | 403 | 503) { super("Acesso indisponível."); }
}

export async function authenticatedClient(writable = false) {
  if (!identityConfigured()) throw new AccessFailure(503);
  const client = await createAuthClient(writable);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AccessFailure(error && error.status && error.status >= 500 ? 503 : 401);
  return client;
}

export async function listContexts(client: Awaited<ReturnType<typeof createAuthClient>>): Promise<AccessContext[]> {
  const { data, error } = await client.rpc("get_my_contexts");
  if (error || !Array.isArray(data)) throw new AccessFailure(503);
  return data.map(parseContext);
}

export async function validateContext(client: Awaited<ReturnType<typeof createAuthClient>>, id: string): Promise<AccessContext> {
  if (!uuidPattern.test(id)) throw new AccessFailure(403);
  const { data, error } = await client.rpc("get_current_context", { p_membership_id: id });
  if (error) throw new AccessFailure(error.message === "ACCESS_DENIED" ? 403 : 503);
  return parseContext(data);
}

export async function selectedContext() {
  const client = await authenticatedClient();
  const id = (await cookies()).get(contextCookie)?.value;
  if (!id) throw new AccessFailure(403);
  const context = await validateContext(client, id);
  return { client, context };
}

export async function pageContext(role?: "admin") {
  try {
    const selected = await selectedContext();
    if (role && selected.context.role !== role) redirect("/acesso-negado");
    return selected;
  } catch (error) {
    if (!(error instanceof AccessFailure)) throw error;
    if (error.status === 401 || error.status === 503) redirect("/login");
    redirect("/selecionar-acesso");
  }
}

export async function writeContext(id: string) {
  (await cookies()).set(contextCookie, id, {
    httpOnly: true, secure: readIdentityConfig().secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8,
  });
}

export async function clearContext() { (await cookies()).delete(contextCookie); }
