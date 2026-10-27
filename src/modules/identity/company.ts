import "server-only";
import { AccessFailure, selectedContext } from "./session";
import type { CompanyData } from "./admin-contracts";

export async function companyDetails() {
  const { client, context } = await selectedContext();
  if (context.role !== "admin") throw new AccessFailure(403);
  const { data, error } = await client.rpc("get_tenant_admin", { p_membership_id: context.membership_id });
  if (error || !data || typeof data !== "object") throw new AccessFailure(error?.message === "ACCESS_DENIED" ? 403 : 503);
  // Explicit DTO; no forwarding of generic DB objects to pages/API.
  const v = data as Record<string, unknown>;
  if (v.id !== context.tenant_id || typeof v.legal_name !== "string" || typeof v.trade_name !== "string" || typeof v.document !== "string") throw new AccessFailure(503);
  const strings=(value:unknown,allowed:string[]):Record<string,string>=>value && typeof value==="object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string]=>allowed.includes(entry[0])&&typeof entry[1]==="string")) : {};
  if (typeof v.revision!=="number" || !Number.isSafeInteger(v.revision)) throw new AccessFailure(503);
  const company:CompanyData={legalName:v.legal_name,tradeName:v.trade_name,document:v.document,revision:v.revision,contact:strings(v.contact,["email","phone"]),address:strings(v.address,["street","number","district","city","state","postal_code"])};
  return { context,company };
}
