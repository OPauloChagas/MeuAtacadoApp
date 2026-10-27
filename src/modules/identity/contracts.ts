export type AccessContext = Readonly<{
  membership_id: string;
  tenant_id: string;
  company_name: string;
  role: "admin" | "seller" | "buyer";
  customer_id: string | null;
  customer_name: string | null;
}>;

export type AuthDestination = "/empresa/inicio" | "/cliente/inicio" | "/selecionar-acesso" | "/sem-acesso" | "/definir-senha" | "/login?senha=atualizada";
export type FormState = { status: "idle" | "error" | "success"; message: string; email?: string; destination?: AuthDestination };
export type FormAction = (state: FormState, data: FormData) => Promise<FormState>;
export const roleLabels = { admin: "Administrador", seller: "Vendedor", buyer: "Comprador" } as const;
export const contextCookie = "atacado-context";
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function dashboardPath(role: AccessContext["role"]): "/empresa/inicio" | "/cliente/inicio" {
  return role === "buyer" ? "/cliente/inicio" : "/empresa/inicio";
}

/** Decode only the explicit projection returned by authorized RPCs. */
export function parseContext(value: unknown): AccessContext {
  if (!value || typeof value !== "object") throw new Error("INVALID_CONTEXT_RESPONSE");
  const v = value as Record<string, unknown>;
  if (typeof v.membership_id !== "string" || !uuidPattern.test(v.membership_id) ||
      typeof v.tenant_id !== "string" || !uuidPattern.test(v.tenant_id) ||
      typeof v.company_name !== "string" || !["admin", "seller", "buyer"].includes(String(v.role)) ||
      !(v.customer_id === null || typeof v.customer_id === "string" && uuidPattern.test(v.customer_id)) ||
      !(v.customer_name === null || typeof v.customer_name === "string") ||
      (v.role === "buyer" && (!v.customer_id || !v.customer_name))) throw new Error("INVALID_CONTEXT_RESPONSE");
  return {
    membership_id: v.membership_id, tenant_id: v.tenant_id, company_name: v.company_name,
    role: v.role as AccessContext["role"], customer_id: v.customer_id, customer_name: v.customer_name,
  };
}

export function readEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function readPassword(value: FormDataEntryValue | null, minimum = 1): string | null {
  return typeof value === "string" && value.length >= minimum && value.length <= 128 ? value : null;
}

export function readRecoveryHash(value: unknown): string | null {
  return typeof value === "string" && /^(?:pkce_)?[a-f0-9]{40,128}$/i.test(value) ? value : null;
}
