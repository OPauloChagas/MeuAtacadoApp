import { id,decimal,record,text,bool,count,CommercialProblem } from "@/modules/commercial/contracts";
export { id };
export class CatalogProblem extends Error { constructor(public readonly code: string) { super(code); } }
const invalid = (): never => { throw new CatalogProblem("VALIDATION_ERROR"); };
export type Product = { id: string; sku: string; name: string; description: string; category: string; salesUnit: string; packageContent: string; minimum: number; multiple: number; hasPhoto: boolean; unitPrice: string };
export type Catalog = { customer: { id: string; name: string }; availability: "ready" | "unavailable"; items: Product[]; total: number; page: number; pageSize: number };
export type LineInput = { product_id: string; quantity: number };
export type Quote = { status: "current" | "price_changed"; token: string; generatedAt: string; items: { productId: string; sku: string; name: string; salesUnit: string; packageContent: string; quantity: number; unitPrice: string; lineTotal: string }[]; total: string };
export type Query = { search: string; category: string; page: number; pageSize: number };
export function query(p: URLSearchParams): Query {
 for (const key of ["q","category","page","pageSize","customerId"]) if (p.getAll(key).length>1) return invalid();
 const search=p.get("q")??"",category=p.get("category")??"",page=Number(p.get("page")??"0"),pageSize=Number(p.get("pageSize")??"20");
 if(search.length>100||category.length>100||!Number.isInteger(page)||page<0||page>10000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)return invalid();
 return {search:search.trim(),category:category.trim(),page,pageSize};
}
export function pageParams(raw: Record<string,string|string[]|undefined>) { const p=new URLSearchParams();for(const [key,value] of Object.entries(raw)){if(Array.isArray(value))return invalid();if(value!==undefined)p.set(key,value);}return p; }
export function customerId(p: URLSearchParams): string|null { if(p.getAll("customerId").length>1)return invalid();return p.has("customerId")?id(p.get("customerId")):null; }
export function token(value: unknown): string { if(typeof value!=="string"||! /^[a-f0-9]{64}$/.test(value))return invalid();return value; }
export function quoteInput(value: unknown): { items: LineInput[]; customer: string|null; expectedToken: string|null } {
 if (!value || typeof value!=="object" || Array.isArray(value)) return invalid();
 const v=record(value);if(Object.keys(v).some(k=>!["items","customerId","expectedToken"].includes(k))||!Array.isArray(v.items)||v.items.length<1||v.items.length>200)return invalid();
 const items=v.items.map(item=>{if(!item||typeof item!=="object"||Array.isArray(item))return invalid();const r=record(item);if(Object.keys(r).length!==2||!Object.hasOwn(r,"product_id")||!Number.isSafeInteger(r.quantity)||typeof r.quantity!=="number"||r.quantity<1||r.quantity>1000000)return invalid();return {product_id:id(r.product_id),quantity:r.quantity};});
 return {items,customer:v.customerId===undefined||v.customerId===null?null:id(v.customerId),expectedToken:v.expectedToken===undefined||v.expectedToken===null?null:token(v.expectedToken)};
}
export function parseCatalog(value: unknown): Catalog {
 const v=record(value),customer=record(v.customer);if(!Array.isArray(v.items)||!["ready","unavailable"].includes(text(v.availability)))throw new CatalogProblem("UNAVAILABLE");
 return {customer:{id:id(customer.id),name:text(customer.name)},availability:v.availability as Catalog["availability"],total:count(v.total),page:count(v.page),pageSize:count(v.page_size,1),items:v.items.map(value=>{const p=record(value);return {id:id(p.id),sku:text(p.sku),name:text(p.name),description:text(p.description),category:text(p.category),salesUnit:text(p.sales_unit),packageContent:text(p.package_content),minimum:count(p.min_quantity,1),multiple:count(p.quantity_multiple,1),hasPhoto:bool(p.has_photo),unitPrice:decimal(p.unit_price)};})};
}
export function parseQuote(value: unknown): Quote {
 const v=record(value);if(!Array.isArray(v.items)||!["current","price_changed"].includes(text(v.status)))throw new CatalogProblem("UNAVAILABLE");
 return {status:v.status as Quote["status"],token:token(v.quote_token),generatedAt:text(v.generated_at),total:decimal(v.total),items:v.items.map(value=>{const p=record(value);return {productId:id(p.product_id),sku:text(p.sku),name:text(p.name),salesUnit:text(p.sales_unit),packageContent:text(p.package_content),quantity:count(p.quantity,1),unitPrice:decimal(p.unit_price),lineTotal:decimal(p.line_total)};})};
}
/** The HTTP DTO uses camelCase; the RPC projection uses database field names. */
export function parseQuoteResponse(value: unknown): Quote {
 const v=record(value);if(!Array.isArray(v.items))throw new CatalogProblem("UNAVAILABLE");
 return parseQuote({status:v.status,quote_token:v.token,generated_at:v.generatedAt,total:v.total,items:v.items.map(value=>{
  const p=record(value);return {product_id:p.productId,sku:p.sku,name:p.name,sales_unit:p.salesUnit,package_content:p.packageContent,quantity:p.quantity,unit_price:p.unitPrice,line_total:p.lineTotal};
 })});
}
export function message(code: string) { const messages:Record<string,string>={VALIDATION_ERROR:"Confira os itens e informe quantidades inteiras, sem campos adicionais.",ACCESS_DENIED:"Catálogo indisponível no seu acesso atual.",PRICING_UNAVAILABLE:"Os preços ainda não estão disponíveis para este cliente. Fale com o fornecedor.",PRODUCT_UNAVAILABLE:"Um produto ficou indisponível. Consulte novamente o catálogo.",QUANTITY_INVALID:"Confira o mínimo, o múltiplo e o limite de quantidade de cada produto.",AMOUNT_LIMIT:"O total ultrapassa o limite permitido. Reduza a quantidade.",PRICE_CHANGED:"Os preços ou as condições mudaram. Revise a nova simulação antes de continuar.",PHOTO_UNAVAILABLE:"Foto indisponível.",UNAVAILABLE:"Não foi possível consultar. Tente novamente mais tarde."};return messages[code]??messages.UNAVAILABLE!; }
export const problemCode=(error: unknown)=>error instanceof CatalogProblem?error.code:error instanceof CommercialProblem&&error.code==="VALIDATION_ERROR"?"VALIDATION_ERROR":"UNAVAILABLE";
