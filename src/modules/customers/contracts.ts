export type Contact = { email: string; phone: string };
export type Address = { street: string; number: string; district: string; city: string; state: string; postal_code: string };
export type CustomerSummary = { id: string; name: string; document: string; status: "active" | "inactive"; revision: number };
export type CustomerDetail = Omit<CustomerSummary, "revision"> & {
  contact: Contact; address: Address; revision?: number;
  sellerId?: string | null; sellerName?: string | null; sellerActive?: boolean | null;
};
export type PageData<T> = { items: T[]; total: number; page: number; pageSize: number };
export type SellerOption = { id: string; name: string };
export type CustomerFormState = { status: "idle" | "error" | "success"; message: string; destination?: string };
export type CustomerFormAction = (state: CustomerFormState, form: FormData) => Promise<CustomerFormState>;
export type ListQuery = { search: string; status: "active" | "inactive" | "all"; page: number; pageSize: number };

export const customerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const contactKeys = ["email", "phone"] as const;
export const addressKeys = ["street", "number", "district", "city", "state", "postal_code"] as const;
export const fieldLabels: Record<string, string> = {
  email: "E-mail de contato", phone: "Telefone", street: "Rua / logradouro", number: "Número",
  district: "Bairro", city: "Cidade", state: "UF", postal_code: "CEP",
};

export class CustomerProblem extends Error {
  constructor(public readonly code: string) { super(code); }
}
export function inputProblem(): never { throw new CustomerProblem("VALIDATION_ERROR"); }
export function documentValue(value: unknown): string {
  if (typeof value !== "string" || value.length > 64 || !/^[A-Za-z0-9. /\s-]+$/.test(value)) return inputProblem();
  const normalized = value.replace(/[. /\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{1,32}$/.test(normalized)) return inputProblem();
  return normalized;
}
export function formText(form: FormData, name: string, maximum: number, required = false): string {
  const value = form.get(name);
  if (typeof value !== "string" || value.trim().length > maximum || (required && !value.trim())) return inputProblem();
  return value.trim();
}
export function uuidValue(value: unknown): string {
  if (typeof value !== "string" || !customerUuid.test(value)) return inputProblem();
  return value;
}
export function positiveRevision(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return inputProblem();
  const revision = Number(value);
  if (!Number.isSafeInteger(revision) || revision < 1) return inputProblem();
  return revision;
}
export function customerContactInput(form: FormData) {
  const email = formText(form, "email", 254).toLowerCase(), phone = formText(form, "phone", 30);
  if ((email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || !/^[+\d ()-]*$/.test(phone)) return inputProblem();
  const address = Object.fromEntries(addressKeys.map(key => [key, formText(form, key, key === "state" ? 2 : 160)])) as Address;
  if (address.state && !/^[A-Za-z]{2}$/.test(address.state)) return inputProblem();
  address.state = address.state.toUpperCase();
  return { contact: { email, phone }, address, key: uuidValue(form.get("key")) };
}
export function customerAdminInput(form: FormData, editing: boolean) {
  const shared = customerContactInput(form), document = documentValue(form.get("document")), name = formText(form, "name", 200, true);
  const seller = form.get("seller_id");
  if (typeof seller !== "string") return inputProblem();
  const sellerId = seller === "" ? null : uuidValue(seller);
  const status = editing ? form.get("status") : "active";
  if (status !== "active" && status !== "inactive") return inputProblem();
  return { ...shared, document, name, sellerId, status };
}
export function listQuery(params: URLSearchParams): ListQuery {
  const search = params.get("q") ?? "", status = params.get("status") ?? "active";
  const page = Number(params.get("page") ?? "0"), pageSize = Number(params.get("pageSize") ?? "20");
  if (search.length > 100 || !["active", "inactive", "all"].includes(status) || !Number.isInteger(page) || page < 0 || page > 10000 ||
      !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return inputProblem();
  return { search: search.trim(), status: status as ListQuery["status"], page, pageSize };
}
export function queryParameters(params: Record<string, string | string[] | undefined>): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of ["q", "status", "page", "pageSize"]) {
    const value = params[key];
    if (Array.isArray(value)) return inputProblem();
    if (value !== undefined) query.set(key, value);
  }
  return query;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CustomerProblem("UNAVAILABLE");
  return value as Record<string, unknown>;
}
function stringValue(value: unknown): string {
  if (typeof value !== "string") throw new CustomerProblem("UNAVAILABLE");
  return value;
}
function numberValue(value: unknown, minimum = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new CustomerProblem("UNAVAILABLE");
  return value;
}
function responseId(value: unknown): string {
  if (typeof value !== "string" || !customerUuid.test(value)) throw new CustomerProblem("UNAVAILABLE");
  return value;
}
function summary(value: unknown): CustomerSummary {
  const v = record(value);
  if (v.status !== "active" && v.status !== "inactive") throw new CustomerProblem("UNAVAILABLE");
  return { id: responseId(v.id), name: stringValue(v.name), document: stringValue(v.document), status: v.status, revision: numberValue(v.revision, 1) };
}
export function pageData<T>(value: unknown, parse: (value: unknown) => T): PageData<T> {
  const v = record(value);
  if (!Array.isArray(v.items)) throw new CustomerProblem("UNAVAILABLE");
  return { items: v.items.map(parse), total: numberValue(v.total), page: numberValue(v.page), pageSize: numberValue(v.page_size, 1) };
}
export const customerPage = (value: unknown) => pageData(value, summary);
export const sellerPage = (value: unknown) => pageData(value, (item: unknown): SellerOption => {
  const v = record(item); return { id: responseId(v.id), name: stringValue(v.name) };
});
function stringFields<T extends string>(value: unknown, keys: readonly T[]): Record<T, string> {
  const v = record(value), result = {} as Record<T, string>;
  for (const key of keys) result[key] = v[key] === undefined ? "" : stringValue(v[key]);
  return result;
}
export function customerDetail(value: unknown, role: "admin" | "seller" | "buyer"): CustomerDetail {
  const v = record(value);
  if (v.status !== "active" && v.status !== "inactive") throw new CustomerProblem("UNAVAILABLE");
  const result: CustomerDetail = { id: responseId(v.id), name: stringValue(v.name), document: stringValue(v.document), status: v.status,
    contact: stringFields(v.contact, contactKeys), address: stringFields(v.address, addressKeys) };
  if (role !== "buyer") result.revision = numberValue(v.revision, 1);
  if (role === "admin") {
    result.sellerId = v.seller_membership_id === null ? null : responseId(v.seller_membership_id);
    result.sellerName = v.seller_name === null ? null : stringValue(v.seller_name);
    if (v.seller_active !== null && typeof v.seller_active !== "boolean") throw new CustomerProblem("UNAVAILABLE");
    result.sellerActive = v.seller_active;
  }
  return result;
}
export function customerMessage(code: string): string {
  const messages: Record<string, string> = {
    VALIDATION_ERROR: "Confira os campos e filtros informados.", DOCUMENT_IN_USE: "Já existe um cliente com este documento nesta empresa.",
    SELLER_UNAVAILABLE: "Escolha um vendedor ativo desta empresa ou deixe sem vendedor.", ACCESS_DENIED: "Cliente ou operação indisponível no seu acesso atual.",
    STALE_VERSION: "O cliente foi alterado por outra pessoa. Recarregue a página antes de salvar.",
    IDEMPOTENCY_CONFLICT: "Esta solicitação já foi usada com outros dados. Recarregue a página.",
    UNAUTHENTICATED: "Entre para continuar.", UNAVAILABLE: "Não foi possível concluir. Tente novamente mais tarde.",
  };
  return messages[code] ?? messages.UNAVAILABLE!;
}
