import "server-only";
import { selectedContext } from "@/modules/identity/session";
import { CommercialProblem, tableRow, versionRow, version, term, customerTerms, assignment, pageData, record, text, decimal, bool, id, type Kind, type Query } from "./contracts";
export type Session = Awaited<ReturnType<typeof selectedContext>>;
const codes = ["ACCESS_DENIED","VALIDATION_ERROR","NAME_IN_USE","STALE_VERSION","IDEMPOTENCY_CONFLICT","PERIOD_OVERLAP","INVALID_WINDOW","PUBLISHED_IMMUTABLE","EMPTY_VERSION","PRODUCT_UNAVAILABLE","TABLE_UNAVAILABLE","TERM_UNAVAILABLE","SELLER_UNAVAILABLE","CUSTOMER_UNAVAILABLE","INVALID_STATE"];
export async function adminSession() { const session = await selectedContext(); if (session.context.role!=="admin") throw new CommercialProblem("ACCESS_DENIED"); return session; }
export async function commercialRpc(session: Session,name: string,args: Record<string,unknown>): Promise<unknown> {
 if (session.context.role!=="admin") throw new CommercialProblem("ACCESS_DENIED");
 const { data,error } = await session.client.rpc(name,{ ...args,p_membership_id: session.context.membership_id });
 if (error) throw new CommercialProblem(codes.includes(error.message) ? error.message : "UNAVAILABLE"); return data;
}
const listArgs = (q: Query) => ({ p_search: q.search,p_status: q.status,p_page: q.page,p_page_size: q.pageSize });
export async function tables(kind: Kind,q: Query) { const session = await adminSession(); return { context: session.context,data: pageData(await commercialRpc(session,"list_commercial_tables",{ p_kind: kind,...listArgs(q) }),tableRow) }; }
export async function versions(kind: Kind,tableId: string,q: Query) { const session = await adminSession(); const raw = record(await commercialRpc(session,"list_commercial_versions",{ p_kind: kind,p_table_id: id(tableId),p_page: q.page,p_page_size: q.pageSize })); return { context: session.context,data: pageData(raw,versionRow),table: tableRow(raw.table),timezone: text(raw.timezone) }; }
export async function versionDetail(kind: Kind,versionId: string,q: Query) { const session = await adminSession(); const raw = record(await commercialRpc(session,"get_commercial_version",{ p_kind: kind,p_version_id: id(versionId),p_search: q.search,p_page: q.page,p_page_size: q.pageSize }));
 return { context: session.context,version: version(raw.version),timezone: text(raw.timezone),data: pageData(raw,item => { const v = record(item); return { productId: id(v.product_id),sku: text(v.sku),name: text(v.name),active: bool(v.active),value: decimal(v.value,kind==="commission") }; }) };
}
export async function paymentTerms(q: Query) { const session = await adminSession(); return { context: session.context,data: pageData(await commercialRpc(session,"list_payment_terms",listArgs(q)),term) }; }
export async function customerCommercial(customerId: string) { const session = await adminSession(); return { context: session.context,data: customerTerms(await commercialRpc(session,"get_customer_commercial",{ p_customer_id: id(customerId) })) }; }
export async function assignments(q: Query) { const session = await adminSession(); const raw = record(await commercialRpc(session,"list_seller_commission_assignments",{ p_search: q.search,p_page: q.page,p_page_size: q.pageSize })); return { context: session.context,timezone: text(raw.timezone),data: pageData(raw,assignment) }; }

export const resources = ["price","commission","payment","product","customer","seller"] as const;
export type Resource = typeof resources[number];
export async function options(resource: Resource,q: Query) {
 const session = await adminSession(); let raw: unknown;
 if (resource==="price" || resource==="commission") raw = await commercialRpc(session,"list_commercial_tables",{ p_kind: resource,...listArgs({ ...q,status: "active" }) });
 else if (resource==="payment") raw = await commercialRpc(session,"list_payment_terms",listArgs({ ...q,status: "active" }));
 else if (resource==="product") raw = await commercialRpc(session,"list_products",listArgs({ ...q,status: "active" }));
 else if (resource==="customer") raw = await commercialRpc(session,"list_customers",listArgs({ ...q,status: "active" }));
 else raw = await commercialRpc(session,"list_customer_sellers",{ p_search: q.search,p_page: q.page,p_page_size: q.pageSize });
 return pageData(raw,item => { const v = record(item); return { id: id(v.id),name: `${typeof v.sku === "string" ? `${v.sku} · ` : ""}${text(v.name)}` }; });
}
