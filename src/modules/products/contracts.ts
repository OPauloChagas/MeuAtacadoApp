import { uuidPattern } from "../identity/contracts";

export type ProductSummary = { id: string; sku: string; name: string; category: string; salesUnit: string; active: boolean; revision: number; hasPhoto: boolean };
export type Product = ProductSummary & { description: string; packageContent: string; minQuantity: number; quantityMultiple: number };
export type ProductPage = { items: ProductSummary[]; total: number; page: number; pageSize: number };
export type ProductQuery = { search: string; status: "active" | "inactive" | "all"; page: number; pageSize: number };
export type ProductFormState = { status: "idle" | "error" | "success"; message: string; destination?: string };
export const PHOTO_LIMIT = 3_000_000;
export class ProductProblem extends Error { constructor(public readonly code: string) { super(code); } }
export function invalid(): never { throw new ProductProblem("VALIDATION_ERROR"); }
export function productId(value: unknown): string { if (typeof value !== "string" || !uuidPattern.test(value)) return invalid(); return value; }
export function positiveInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return invalid();
  const n = Number(value); if (!Number.isSafeInteger(n) || n < 1 || n > maximum) return invalid(); return n;
}
export function skuValue(value: unknown): string {
  if (typeof value !== "string") return invalid();
  const sku = value.trim().toUpperCase(); if (!/^[A-Z0-9][A-Z0-9._/-]{0,63}$/.test(sku)) return invalid(); return sku;
}
function text(form: FormData, key: string, maximum: number, required = false): string {
  const v = form.get(key); if (typeof v !== "string" || v.trim().length > maximum || (required && !v.trim())) return invalid(); return v.trim();
}
export function productInput(form: FormData, editing: boolean) {
  const active = editing ? form.get("active") : "true"; if (active !== "true" && active !== "false") return invalid();
  return { sku: skuValue(form.get("sku")), name: text(form,"name",200,true), description: text(form,"description",2000),
    category: text(form,"category",100), salesUnit: text(form,"sales_unit",32,true), packageContent: text(form,"package_content",160),
    minQuantity: positiveInteger(form.get("min_quantity"),1_000_000), quantityMultiple: positiveInteger(form.get("quantity_multiple"),1_000_000),
    active: active === "true", key: productId(form.get("key")) };
}
export function productQuery(params: URLSearchParams): ProductQuery {
  for (const key of ["q","status","page","pageSize"]) if (params.getAll(key).length > 1) return invalid();
  const search = params.get("q") ?? "", status = params.get("status") ?? "active";
  const page = Number(params.get("page") ?? "0"), pageSize = Number(params.get("pageSize") ?? "20");
  if (search.length > 100 || !["active","inactive","all"].includes(status) || !Number.isInteger(page) || page < 0 || page > 10000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return invalid();
  return { search: search.trim(), status: status as ProductQuery["status"], page, pageSize };
}
export function productParams(params: Record<string,string | string[] | undefined>): URLSearchParams {
  const query = new URLSearchParams(); for (const key of ["q","status","page","pageSize"]) {
    const value = params[key]; if (Array.isArray(value)) return invalid(); if (value !== undefined) query.set(key,value);
  } return query;
}
export function record(value: unknown): Record<string,unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProductProblem("UNAVAILABLE"); return value as Record<string,unknown>; }
function string(value: unknown): string { if (typeof value !== "string") throw new ProductProblem("UNAVAILABLE"); return value; }
function integer(value: unknown, minimum = 0): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new ProductProblem("UNAVAILABLE"); return value; }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") throw new ProductProblem("UNAVAILABLE"); return value; }
export function productSummary(value: unknown): ProductSummary {
  const v = record(value); return { id: productId(v.id), sku: string(v.sku), name: string(v.name), category: string(v.category), salesUnit: string(v.sales_unit),
    active: boolean(v.active), revision: integer(v.revision,1), hasPhoto: boolean(v.has_photo) };
}
export function productDetail(value: unknown): Product {
  const v = record(value); return { ...productSummary({ ...v, has_photo: v.photo_path !== null }), description: string(v.description),
    packageContent: string(v.package_content), minQuantity: integer(v.min_quantity,1), quantityMultiple: integer(v.quantity_multiple,1) };
}
export function productPage(value: unknown): ProductPage {
  const v = record(value); if (!Array.isArray(v.items)) throw new ProductProblem("UNAVAILABLE");
  return { items: v.items.map(productSummary), total: integer(v.total), page: integer(v.page), pageSize: integer(v.page_size,1) };
}
export function photoPath(value: unknown, tenant: string, product: string): string {
  const v = string(value); const prefix = `${tenant}/${product}/`;
  if (!v.startsWith(prefix) || !uuidPattern.test(v.slice(prefix.length,-5)) || !v.endsWith(".webp")) throw new ProductProblem("UNAVAILABLE"); return v;
}
export function productMessage(code: string): string {
  const messages: Record<string,string> = { VALIDATION_ERROR: "Confira os campos e filtros informados.", SKU_IN_USE: "Já existe um produto com este SKU nesta empresa.",
    STALE_VERSION: "O produto foi alterado por outra pessoa. Recarregue a página antes de salvar.", IDEMPOTENCY_CONFLICT: "Esta solicitação já foi usada com outros dados. Recarregue a página.",
    ACCESS_DENIED: "Produto ou operação indisponível no seu acesso atual.", UNAUTHENTICATED: "Entre para continuar.",
    PHOTO_INVALID: "Escolha uma foto JPEG, PNG ou WebP válida, sem animação e com até 16 milhões de pixels.", PHOTO_TOO_LARGE: "A foto deve ter no máximo 3 MB.",
    PHOTO_IN_PROGRESS: "Já existe um envio de foto em andamento. Aguarde ou limpe os envios expirados.", PHOTO_UNAVAILABLE: "A foto não está disponível. Recarregue a página e tente novamente.",
    STORAGE_UNAVAILABLE: "Não foi possível armazenar a foto. Seu cadastro foi preservado; tente novamente.", UNAVAILABLE: "Não foi possível concluir. Tente novamente mais tarde." };
  return messages[code] ?? messages.UNAVAILABLE!;
}
