import "server-only";
import type { createAuthClient } from "@/lib/supabase/server";
import { selectedContext } from "@/modules/identity/session";
import { CustomerProblem, customerDetail, customerPage, sellerPage, uuidValue, type ListQuery } from "./contracts";

type Client = Awaited<ReturnType<typeof createAuthClient>>;
const domainCodes = ["ACCESS_DENIED", "VALIDATION_ERROR", "DOCUMENT_IN_USE", "SELLER_UNAVAILABLE", "STALE_VERSION", "IDEMPOTENCY_CONFLICT"];
export async function customerRpc(client: Client, name: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new CustomerProblem(domainCodes.includes(error.message) ? error.message : "UNAVAILABLE");
  return data;
}
export async function findCustomers(query: ListQuery) {
  const { client, context } = await selectedContext();
  if (context.role === "buyer") throw new CustomerProblem("ACCESS_DENIED");
  const data = await customerRpc(client, "list_customers", { p_membership_id: context.membership_id, p_search: query.search, p_status: query.status, p_page: query.page, p_page_size: query.pageSize });
  return { context, data: customerPage(data) };
}
export async function findCustomer(id: string) {
  const { client, context } = await selectedContext();
  const data = await customerRpc(client, "get_customer", { p_membership_id: context.membership_id, p_customer_id: uuidValue(id) });
  return { context, data: customerDetail(data, context.role) };
}
export async function findCustomerSellers(query: ListQuery) {
  const { client, context } = await selectedContext();
  if (context.role !== "admin") throw new CustomerProblem("ACCESS_DENIED");
  const data = await customerRpc(client, "list_customer_sellers", { p_membership_id: context.membership_id, p_search: query.search, p_page: query.page, p_page_size: query.pageSize });
  return { context, data: sellerPage(data) };
}
