import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rpc } from "../admin/helpers";
import type { Fixtures } from "../auth/setup";
import type { CustomerFixtures } from "./setup";

export { rpc };
export const fixtures = () => JSON.parse(process.env.E2E_CUSTOMER_FIXTURES!) as CustomerFixtures;
export async function login(page: Page, actor: keyof Fixtures["actors"], choice?: "admin" | "seller" | "A" | "B") {
  const f = fixtures();
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.base.actors[actor].email);
  await page.getByLabel("Senha", { exact: true }).fill(f.base.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/(empresa\/inicio|cliente\/inicio|selecionar-acesso)$/);
  if (choice) {
    const name = choice === "admin" ? /Administrador/ : choice === "seller" ? /Vendedor/ : new RegExp(choice === "A" ? f.base.companyA : f.base.companyB);
    await page.getByRole("radio", { name }).check();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/(empresa\/inicio|cliente\/inicio)$/);
  }
}
export const createPayload = (document: string, name: string, seller: string | null = null) => ({
  p_membership_id: fixtures().base.memberAdminA, p_document: document, p_name: name, p_contact: {}, p_address: {},
  p_seller_membership_id: seller, p_idempotency_key: randomUUID(),
});
export async function adminDetail(id: string) {
  const result = await rpc("adminA", "get_customer", { p_membership_id: fixtures().base.memberAdminA, p_customer_id: id });
  expect(result.status).toBe(200); return result.data;
}
export async function updatePayload(id: string, changes: Record<string, unknown> = {}) {
  const current = await adminDetail(id);
  return { p_membership_id: fixtures().base.memberAdminA, p_customer_id: id, p_expected_revision: current.revision,
    p_document: current.document, p_name: current.name, p_contact: current.contact, p_address: current.address,
    p_seller_membership_id: current.seller_membership_id, p_status: current.status, p_idempotency_key: randomUUID(), ...changes };
}
export function succeed(result: { status: number; data: unknown }) {
  if (result.status !== 200) throw new Error(`RPC local recusado: ${(result.data as { message?: string }).message ?? result.status}`);
  return result.data as Record<string, unknown>;
}
