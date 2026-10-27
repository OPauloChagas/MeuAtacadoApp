import { readPublicSupabaseConfig } from "../env";

export function readIdentityConfig() {
  const config = readPublicSupabaseConfig(process.env);
  const origin = new URL(process.env.APP_URL ?? "");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if ((origin.protocol !== "https:" && !(origin.protocol === "http:" && local)) ||
      origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) {
    throw new Error("APP_URL exige origem HTTPS ou HTTP local.");
  }
  return { ...config, origin: origin.origin, secure: origin.protocol === "https:" };
}

export function identityConfigured(): boolean {
  try { readIdentityConfig(); return true; } catch { return false; }
}

export function passwordRecoveryConfigured(): boolean {
  return identityConfigured() && [undefined, "true"].includes(process.env.AUTH_RECOVERY_ENABLED);
}
