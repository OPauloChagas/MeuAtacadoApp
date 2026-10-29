import "server-only";
import { selectedContext } from "@/modules/identity/session";
import { CatalogProblem,id,parseCatalog,parseQuote,type Query,type LineInput } from "./contracts";
export type Session=Awaited<ReturnType<typeof selectedContext>>;
const codes=["ACCESS_DENIED","VALIDATION_ERROR","PRICING_UNAVAILABLE","PRODUCT_UNAVAILABLE","QUANTITY_INVALID","AMOUNT_LIMIT","PHOTO_UNAVAILABLE"];
export function selectedCustomer(session: Session,customer: string|null) {
 if(session.context.role==="buyer") {if(customer!==null&&customer!==session.context.customer_id)throw new CatalogProblem("ACCESS_DENIED");return session.context.customer_id!;}
 if(customer===null)throw new CatalogProblem("VALIDATION_ERROR");return id(customer);
}
async function rpc(session:Session,name:string,args:Record<string,unknown>) { const {data,error}=await session.client.rpc(name,{...args,p_membership_id:session.context.membership_id});if(error)throw new CatalogProblem(codes.includes(error.message)?error.message:"UNAVAILABLE");return data; }
export async function listCatalog(customer:string|null,q:Query) {const session=await selectedContext();return {context:session.context,data:parseCatalog(await rpc(session,"list_catalog",{p_customer_id:selectedCustomer(session,customer),p_search:q.search,p_category:q.category,p_page:q.page,p_page_size:q.pageSize}))};}
export async function quoteCatalog(session:Session,customer:string|null,items:LineInput[],expectedToken:string|null) {return parseQuote(await rpc(session,"quote_catalog",{p_customer_id:selectedCustomer(session,customer),p_items:items,p_expected_token:expectedToken}));}
export async function photoReference(session:Session,customer:string|null,product:string) {const data=await rpc(session,"get_catalog_photo",{p_customer_id:selectedCustomer(session,customer),p_product_id:id(product)}) as Record<string,unknown>;return `${session.context.tenant_id}/${id(data.product_id)}/${id(data.photo_id)}.webp`;}
