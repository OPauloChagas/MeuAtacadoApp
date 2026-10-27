import { randomUUID,createHash } from "node:crypto";
import { expect } from "@playwright/test";
import { actorToken, rpc } from "../admin/helpers";
import type { Fixtures } from "../auth/setup";
import type { ProductFixtures } from "./setup";
export { rpc, actorToken };
export { login } from "../customers/helpers";
export const fixtures = () => JSON.parse(process.env.E2E_PRODUCT_FIXTURES!) as ProductFixtures;
export const base = () => fixtures().customers.base;
export function succeed(result: { status: number; data: unknown }) { if (result.status !== 200) throw new Error(`RPC local: ${(result.data as { message?: string }).message ?? result.status}`); return result.data as Record<string,unknown>; }
export const createPayload = (sku = `P-${randomUUID()}`) => ({ p_membership_id: base().memberAdminA, p_sku: sku, p_name: `Produto fictício ${sku}`, p_description: "Descrição", p_category: "Salgados", p_sales_unit: "caixa", p_package_content: "50 unidades", p_min_quantity: 2, p_quantity_multiple: 2, p_idempotency_key: randomUUID() });
export async function create(sku?: string) { return succeed(await rpc("adminA","create_product",createPayload(sku))).product_id as string; }
export async function detail(id: string) { return succeed(await rpc("adminA","get_product",{ p_membership_id: base().memberAdminA, p_product_id: id })); }
export async function editPayload(id: string,changes: Record<string,unknown> = {}) {
  const p = await detail(id); return { p_membership_id: base().memberAdminA, p_product_id: id, p_expected_revision: p.revision,
    p_sku: p.sku, p_name: p.name, p_description: p.description, p_category: p.category, p_sales_unit: p.sales_unit, p_package_content: p.package_content,
    p_min_quantity: p.min_quantity, p_quantity_multiple: p.quantity_multiple, p_active: p.active, p_idempotency_key: randomUUID(), ...changes };
}
export async function storage(actor: keyof Fixtures["actors"],path: string,method = "GET",body?: Uint8Array | Record<string,unknown>,extra: Record<string,string> = {}) {
  const headers = { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${await actorToken(actor)}`, ...(body ? { "Content-Type": body instanceof Uint8Array ? "image/webp" : "application/json" } : {}), ...extra };
  return fetch(`http://127.0.0.1:54321/storage/v1/${path}`,{ method, headers, ...(body ? { body: body instanceof Uint8Array ? new Uint8Array(body) : JSON.stringify(body) } : {}) });
}
export async function prepare(id: string,bytes: Uint8Array) {
  const current = await detail(id), key = randomUUID(); const ticket = succeed(await rpc("adminA","prepare_product_photo",{ p_membership_id: base().memberAdminA, p_product_id: id, p_expected_revision: current.revision, p_checksum: createHash("sha256").update(bytes).digest("hex"), p_idempotency_key: key }));
  return { ticket, key, revision: current.revision };
}
export async function activate(id: string,prepared: Awaited<ReturnType<typeof prepare>>) {
  return rpc("adminA","set_product_photo",{ p_membership_id: base().memberAdminA, p_product_id: id, p_expected_revision: prepared.revision, p_photo_id: prepared.ticket.photo_id, p_idempotency_key: prepared.key });
}
export async function upload(id: string,bytes: Uint8Array) {
  const p = await prepare(id,bytes); expect((await storage("adminA",`object/product-photos/${p.ticket.object_path}`,"POST",bytes)).status).toBe(200); succeed(await activate(id,p)); return p;
}
