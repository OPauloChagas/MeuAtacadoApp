import { randomUUID } from "node:crypto";
import { expect,type Locator } from "@playwright/test";
import { rpc,actorToken } from "../admin/helpers";
import type { CommercialFixtures } from "./setup";
export { rpc,actorToken };
export { login } from "../customers/helpers";
export type Kind = "price" | "commission";
export const fixtures = () => JSON.parse(process.env.E2E_COMMERCIAL_FIXTURES!) as CommercialFixtures;
export const base = () => fixtures().products.customers.base;
export const member = () => ({ p_membership_id: base().memberAdminA });
export const YEAR = new Date().getUTCFullYear()+2;
export const day = (month: number,date = 1) => `${YEAR}-${String(month).padStart(2,"0")}-${String(date).padStart(2,"0")}`;
export function succeed(result: { status: number; data: unknown }) { if (result.status!==200) throw new Error(`RPC local: ${(result.data as { message?: string }).message ?? result.status}`); return result.data as Record<string,unknown>; }
export async function table(kind: Kind,name = `${kind} ${randomUUID()}`) { return succeed(await rpc("adminA","save_commercial_table",{ ...member(),p_kind: kind,p_id: null,p_expected_revision: null,p_name: name,p_active: true,p_idempotency_key: randomUUID() })).id as string; }
export async function draft(kind: Kind,tableId: string,start: string | null = null,end: string | null = null,rate: unknown = "0.0000",key = randomUUID()) {
 return succeed(await rpc("adminA","save_commercial_version",{ ...member(),p_kind: kind,p_table_id: tableId,p_id: null,p_expected_revision: null,p_start_on: start,p_end_on: end,p_default_rate: kind==="commission" ? rate : null,p_idempotency_key: key })).id as string;
}
export async function detail(kind: Kind,id: string) { return succeed(await rpc("adminA","get_commercial_version",{ ...member(),p_kind: kind,p_version_id: id })); }
export async function set(kind: Kind,id: string,value: unknown,product = fixtures().products.productA,key = randomUUID()) { const raw = await detail(kind,id); return rpc("adminA","set_commercial_item",{ ...member(),p_kind: kind,p_version_id: id,p_expected_revision: (raw.version as { revision: number }).revision,p_product_id: product,p_value: value,p_idempotency_key: key }); }
export async function publish(kind: Kind,id: string,key = randomUUID()) { const raw = await detail(kind,id); return rpc("adminA","publish_commercial_version",{ ...member(),p_kind: kind,p_version_id: id,p_expected_revision: (raw.version as { revision: number }).revision,p_idempotency_key: key }); }
export async function pick(form: Locator,label: string,value: string,search: string) {
 const group = form.getByRole("group",{ name: label,exact: true }); await group.getByLabel(`Buscar ${label.toLowerCase()}`,{ exact: true }).fill(search);
 await group.getByRole("button",{ name: `Buscar ${label.toLowerCase()}`,exact: true }).click();
 const select = group.getByRole("combobox"); await expect(select.locator(`option[value="${value}"]`)).toHaveCount(1); await select.selectOption(value);
}
