"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { identityConfigured, passwordRecoveryConfigured, readIdentityConfig } from "@/lib/supabase/config";
import { clearContext, writeContext, listContexts, authenticatedClient } from "./session";
import { dashboardPath, readEmail, readPassword, readRecoveryHash, type AuthDestination, type FormState } from "./contracts";

const unavailable: FormState = { status: "error", message: "O acesso está temporariamente indisponível. Tente novamente mais tarde." };

export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const email = readEmail(form.get("email"));
  const password = readPassword(form.get("password"));
  if (!email || !password) return { status: "error", message: "Informe um e-mail válido e sua senha." };
  if (!identityConfigured()) return unavailable;
  const client = await createAuthClient(true);
  await clearContext();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: "Não foi possível entrar. Confira e-mail e senha ou tente novamente mais tarde.", email };
  let destination: AuthDestination = "/selecionar-acesso";
  try {
    const verified = await authenticatedClient();
    const contexts = await listContexts(verified);
    if (contexts.length === 0) destination = "/sem-acesso";
    if (contexts.length === 1 && contexts[0]) {
      await writeContext(contexts[0].membership_id);
      destination = dashboardPath(contexts[0].role);
    }
  } catch { return unavailable; }
  return { status: "success", message: "", destination };
}

export async function recoverPassword(_state: FormState, form: FormData): Promise<FormState> {
  const email = readEmail(form.get("email"));
  if (!email) return { status: "error", message: "Informe um e-mail válido." };
  if (!passwordRecoveryConfigured()) return unavailable;
  try {
    const client = await createAuthClient(true);
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${readIdentityConfig().origin}/auth/confirm` });
  } catch { /* Same result for unknown account, rate limit, provider failure or success. */ }
  return { status: "success", message: "Se houver uma conta para este e-mail, você receberá as instruções de recuperação. Se não chegar, aguarde e tente novamente.", email };
}

export async function confirmRecovery(_state: FormState, form: FormData): Promise<FormState> {
  const token = readRecoveryHash(form.get("token_hash"));
  if (!token || !passwordRecoveryConfigured()) {
    return { status: "error", message: "Este link é inválido ou expirou. Solicite uma nova recuperação." };
  }
  const client = await createAuthClient(true);
  const { error } = await client.auth.verifyOtp({ token_hash: token, type: "recovery" });
  if (error) return { status: "error", message: "Este link é inválido ou expirou. Solicite uma nova recuperação." };
  await clearContext();
  return { status: "success", message: "", destination: "/definir-senha" };
}

export async function changePassword(_state: FormState, form: FormData): Promise<FormState> {
  const password = readPassword(form.get("password"), 12);
  if (!password || password !== form.get("confirmation")) {
    return { status: "error", message: "Use de 12 a 128 caracteres e repita a mesma senha nos dois campos." };
  }
  try {
    const client = await authenticatedClient(true);
    const { error } = await client.auth.updateUser({ password });
    if (error) return { status: "error", message: "Não foi possível atualizar a senha. Use uma senha diferente ou solicite uma nova recuperação." };
    await client.auth.signOut({ scope: "local" });
    await clearContext();
  } catch { return unavailable; }
  // Redirect before Next re-renders this protected page after deleting cookies.
  redirect("/login?senha=atualizada");
}
