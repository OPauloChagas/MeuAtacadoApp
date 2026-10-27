import "server-only";
import { selectedContext } from "@/modules/identity/session";
import { productDetail, productPage, productId, record, photoPath, ProductProblem, type ProductQuery } from "./contracts";

export type ProductSession = Awaited<ReturnType<typeof selectedContext>>;
const codes = ["ACCESS_DENIED","VALIDATION_ERROR","SKU_IN_USE","STALE_VERSION","IDEMPOTENCY_CONFLICT","PHOTO_IN_PROGRESS","PHOTO_UNAVAILABLE"];
export async function productRpc(session: ProductSession, name: string, args: Record<string,unknown>): Promise<unknown> {
  const { data, error } = await session.client.rpc(name,{ ...args, p_membership_id: session.context.membership_id });
  if (error) throw new ProductProblem(codes.includes(error.message) ? error.message : "UNAVAILABLE"); return data;
}
export async function findProducts(query: ProductQuery) {
  const session = await selectedContext(); if (session.context.role === "buyer") throw new ProductProblem("ACCESS_DENIED");
  const data = productPage(await productRpc(session,"list_products",{ p_search: query.search, p_status: query.status, p_page: query.page, p_page_size: query.pageSize }));
  return { context: session.context, data };
}
export async function readProduct(session: ProductSession,id: string) {
  if (session.context.role === "buyer") throw new ProductProblem("ACCESS_DENIED");
  const raw = record(await productRpc(session,"get_product",{ p_product_id: productId(id) }));
  const path = raw.photo_path === null ? null : photoPath(raw.photo_path,session.context.tenant_id,id);
  return { data: productDetail(raw), path };
}
export async function findProduct(id: string) { const session = await selectedContext(); return { context: session.context, ...(await readProduct(session,id)) }; }
