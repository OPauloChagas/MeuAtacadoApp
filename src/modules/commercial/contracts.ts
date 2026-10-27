import { uuidPattern } from "../identity/contracts";
export type Kind = "price" | "commission";
export type TableRow = { id: string; name: string; active: boolean; revision: number };
export type PageData<T> = { items: T[]; total: number; page: number; pageSize: number };
export type Query = { search: string; status: "active" | "inactive" | "all"; page: number; pageSize: number };
export type VersionRow = { id: string; version: number; state: "draft" | "published"; validFrom: string | null; validUntil: string | null; revision: number; defaultRate: string | null };
export type Version = VersionRow & { tableId: string; tableName: string; tableActive: boolean; startOn: string | null; endOn: string | null };
export type Item = { productId: string; sku: string; name: string; active: boolean; value: string };
export type Term = TableRow & { installments: number; firstDueDays: number; intervalDays: number };
export type CustomerTerms = { id: string; name: string; status: "active" | "inactive"; revision: number; priceListId: string | null; priceListName: string | null; priceListActive: boolean | null; paymentTermId: string | null; paymentTermName: string | null; paymentTermActive: boolean | null };
export type Assignment = { id: string; sellerId: string; sellerName: string; sellerActive: boolean; tableId: string; tableName: string; tableActive: boolean; validFrom: string; validUntil: string | null; revision: number; state: "scheduled" | "current" | "ended" | "cancelled" };
export type FormState = { status: "idle" | "error" | "success"; message: string; destination?: string };
export class CommercialProblem extends Error { constructor(public readonly code: string) { super(code); } }
export function invalid(): never { throw new CommercialProblem("VALIDATION_ERROR"); }
export function id(value: unknown): string { if (typeof value !== "string" || !uuidPattern.test(value)) return invalid(); return value.toLowerCase(); }
export function optionalId(value: unknown): string | null { return value === "" || value === null ? null : id(value); }
export function kind(value: unknown): Kind { if (value !== "price" && value !== "commission") return invalid(); return value; }
export const tablePath = (value: Kind) => value === "price" ? "/empresa/tabelas-preco" : "/empresa/comissoes";
export const versionPath = (value: Kind,version: string) => `${tablePath(value)}/versoes/${id(version)}`;
export function formText(form: FormData,key: string,max = 100): string { const v = form.get(key); if (typeof v !== "string" || !v.trim() || v.trim().length>max) return invalid(); return v.trim(); }
export function integer(value: unknown,min = 1,max = Number.MAX_SAFE_INTEGER): number { if (typeof value !== "string" || !/^\d+$/.test(value)) return invalid(); const n = Number(value); if (!Number.isSafeInteger(n) || n<min || n>max) return invalid(); return n; }
export function activeValue(value: unknown): boolean { if (value !== "true" && value !== "false") return invalid(); return value === "true"; }
export function calendarDate(value: unknown): string | null {
 if (value === "" || value === null) return null;
 if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value<"1900-01-01" || value>"9999-12-31") return invalid();
 const date = new Date(`${value}T00:00:00Z`); if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value) return invalid(); return value;
}
/** Exact normalization. Number/parseFloat are never used for prices or rates. */
export function decimal(value: unknown,rate = false): string {
 if (typeof value !== "string" || value.length>80) return invalid();
 const text = value.trim(), scale = rate ? 4 : 2;
 if (!(rate ? /^\d+(?:[.,]\d{1,4})?$/ : /^\d+(?:[.,]\d{1,2})?$/).test(text)) return invalid();
 const [whole = "",fraction = ""] = text.replace(",",".").split(".");
 const normalized = BigInt(whole).toString(); if (normalized.length>(rate ? 3 : 16)) return invalid();
 const places = 10n ** BigInt(scale), units = BigInt(normalized)*places+BigInt(fraction.padEnd(scale,"0"));
 if (rate ? units>100n*places : units<=0n) return invalid();
 return `${normalized}.${fraction.padEnd(scale,"0")}`;
}
export function brl(value: string): string { const canonical = decimal(value); const [whole,fraction] = canonical.split("."); return `R$ ${whole!.replace(/\B(?=(\d{3})+(?!\d))/g,".")},${fraction}`; }
export const rateLabel = (value: string) => `${decimal(value,true).replace(".",",")} %`;
export function query(params: URLSearchParams): Query {
 for (const key of ["q","status","page","pageSize"]) if (params.getAll(key).length>1) return invalid();
 const search = params.get("q") ?? "", status = params.get("status") ?? "active";
 const page = Number(params.get("page") ?? "0"), pageSize = Number(params.get("pageSize") ?? "20");
 if (search.length>100 || !["active","inactive","all"].includes(status) || !Number.isInteger(page) || page<0 || page>10000 || !Number.isInteger(pageSize) || pageSize<1 || pageSize>100) return invalid();
 return { search: search.trim(),status: status as Query["status"],page,pageSize };
}
export function params(raw: Record<string,string | string[] | undefined>): URLSearchParams { const p = new URLSearchParams(); for (const key of ["q","status","page","pageSize"]) { const value = raw[key]; if (Array.isArray(value)) return invalid(); if (value!==undefined) p.set(key,value); } return p; }
export function record(value: unknown): Record<string,unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new CommercialProblem("UNAVAILABLE"); return value as Record<string,unknown>; }
export function text(value: unknown): string { if (typeof value !== "string") throw new CommercialProblem("UNAVAILABLE"); return value; }
export function bool(value: unknown): boolean { if (typeof value !== "boolean") throw new CommercialProblem("UNAVAILABLE"); return value; }
export function count(value: unknown,min = 0): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value<min) throw new CommercialProblem("UNAVAILABLE"); return value; }
const nullableText = (value: unknown) => value === null ? null : text(value);
const nullableId = (value: unknown) => value === null ? null : id(value);
const nullableBool = (value: unknown) => value === null ? null : bool(value);
export function tableRow(value: unknown): TableRow { const v = record(value); return { id: id(v.id),name: text(v.name),active: bool(v.active),revision: count(v.revision,1) }; }
export function pageData<T>(value: unknown,parse: (value: unknown)=>T): PageData<T> { const v = record(value); if (!Array.isArray(v.items)) throw new CommercialProblem("UNAVAILABLE"); return { items: v.items.map(parse),total: count(v.total),page: count(v.page),pageSize: count(v.page_size,1) }; }
export function versionRow(value: unknown): VersionRow { const v = record(value); if (v.state!=="draft" && v.state!=="published") throw new CommercialProblem("UNAVAILABLE"); return { id: id(v.id),version: count(v.version,1),state: v.state,validFrom: nullableText(v.valid_from),validUntil: nullableText(v.valid_until),revision: count(v.revision,1),defaultRate: v.default_rate === null ? null : decimal(v.default_rate,true) }; }
export function version(value: unknown): Version { const v = record(value); return { ...versionRow(v),tableId: id(v.table_id),tableName: text(v.table_name),tableActive: bool(v.table_active),startOn: nullableText(v.start_on),endOn: nullableText(v.end_on) }; }
export function term(value: unknown): Term { const v = record(value); return { ...tableRow(v),installments: count(v.installments,1),firstDueDays: count(v.first_due_days),intervalDays: count(v.interval_days) }; }
export function customerTerms(value: unknown): CustomerTerms { const v = record(value); if (v.status!=="active" && v.status!=="inactive") throw new CommercialProblem("UNAVAILABLE"); return { id: id(v.id),name: text(v.name),status: v.status,revision: count(v.revision,1),priceListId: nullableId(v.price_list_id),priceListName: nullableText(v.price_list_name),priceListActive: nullableBool(v.price_list_active),paymentTermId: nullableId(v.payment_term_id),paymentTermName: nullableText(v.payment_term_name),paymentTermActive: nullableBool(v.payment_term_active) }; }
export function assignment(value: unknown): Assignment { const v = record(value); if (!["scheduled","current","ended","cancelled"].includes(text(v.state))) throw new CommercialProblem("UNAVAILABLE"); return { id: id(v.id),sellerId: id(v.seller_membership_id),sellerName: text(v.seller_name),sellerActive: bool(v.seller_active),tableId: id(v.table_id),tableName: text(v.table_name),tableActive: bool(v.table_active),validFrom: text(v.valid_from),validUntil: nullableText(v.valid_until),revision: count(v.revision,1),state: v.state as Assignment["state"] }; }
export function message(code: string): string {
 const m: Record<string,string> = { VALIDATION_ERROR: "Confira os campos. Use valores decimais sem separador de milhar e sem casas extras.", ACCESS_DENIED: "Operação indisponível no seu acesso atual.", NAME_IN_USE: "Já existe um cadastro com este nome nesta empresa.", STALE_VERSION: "Este cadastro foi alterado por outra pessoa. Recarregue antes de salvar.", IDEMPOTENCY_CONFLICT: "Esta solicitação já foi usada com outros dados. Recarregue a página.", PERIOD_OVERLAP: "A vigência sobrepõe outro período. Versões publicadas não podem ser encurtadas; escolha outro período ou tabela.", INVALID_WINDOW: "Confira a vigência: o fim é exclusivo e deve ser posterior ao início, sem encerrar no passado.", PUBLISHED_IMMUTABLE: "Versões publicadas não podem ser alteradas. Prepare outra versão ou tabela.", EMPTY_VERSION: "Adicione pelo menos um produto com preço antes de publicar.", PRODUCT_UNAVAILABLE: "Escolha um produto ativo desta empresa.", TABLE_UNAVAILABLE: "Escolha uma tabela ativa desta empresa.", TERM_UNAVAILABLE: "Escolha uma condição de pagamento ativa desta empresa.", SELLER_UNAVAILABLE: "Escolha um vendedor ativo desta empresa.", CUSTOMER_UNAVAILABLE: "Reative o cliente antes de alterar suas condições comerciais.", INVALID_STATE: "Esta atribuição já foi encerrada ou cancelada.", UNAVAILABLE: "Não foi possível concluir. Tente novamente mais tarde." };
 return m[code] ?? m.UNAVAILABLE!;
}
