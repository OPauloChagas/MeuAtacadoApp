import { describe, expect, it } from "vitest";
import { documentValue, customerAdminInput, customerContactInput, customerDetail, customerPage, listQuery, queryParameters, positiveRevision, customerMessage } from "./contracts";

const id = "00000000-0000-4000-8000-000000000001";
function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.set(key, value)); return data; }
const fields = { email: "  Contato@Example.test ", phone: "(11) 99999-0000", street: "Rua", number: "1", district: "Centro", city: "Cidade", state: "sp", postal_code: "00000-000", key: id };

describe("contratos de clientes", () => {
  it("compara documento por letras/números, sem prometer validação fiscal", () => {
    expect(documentValue(" ab.12 / 34-5 ")).toBe("AB12345");
    expect(documentValue("AB12345")).toBe(documentValue("ab-12345"));
    for (const invalid of [null, "", "---", "☃", "x@y", "<script>", "A".repeat(33), " ".repeat(65)]) expect(() => documentValue(invalid)).toThrow("VALIDATION_ERROR");
  });
  it("valida contatos/endereço e preserva apenas a allowlist", () => {
    const parsed = customerContactInput(form({ ...fields, tenant_id: id, price: "0.01", role: "admin" }));
    expect(parsed.contact).toEqual({ email: "contato@example.test", phone: "(11) 99999-0000" });
    expect(parsed.address.state).toBe("SP");
    expect(parsed).not.toHaveProperty("tenant_id");
    expect(parsed).not.toHaveProperty("role");
    for (const invalid of [{ email: "inválido" }, { phone: "<script>" }, { state: "SPX" }, { key: "falso" }, { city: "X".repeat(161) }]) expect(() => customerContactInput(form({ ...fields, ...invalid }))).toThrow();
  });
  it("exige documento/nome e valida revisão, status e seleção de seller", () => {
    const valid = { ...fields, name: " Cliente ", document: "AB-123", seller_id: "", status: "inactive" };
    expect(customerAdminInput(form(valid), false)).toMatchObject({ name: "Cliente", document: "AB123", sellerId: null, status: "active" });
    expect(customerAdminInput(form(valid), true).status).toBe("inactive");
    for (const invalid of [{ name: " " }, { seller_id: "falso" }, { status: "deleted" }]) expect(() => customerAdminInput(form({ ...valid, ...invalid }), true)).toThrow();
    expect(positiveRevision("1")).toBe(1);
    for (const invalid of ["0", "1.5", "1e0", null, "99999999999999999999"]) expect(() => positiveRevision(invalid)).toThrow();
  });
  it("limita paginação/pesquisa e não interpreta curingas como consulta ampla", () => {
    expect(listQuery(new URLSearchParams())).toEqual({ search: "", status: "active", page: 0, pageSize: 20 });
    expect(listQuery(new URLSearchParams({ q: "%_", page: "2", pageSize: "1" })).search).toBe("%_");
    for (const query of [{ page: "-1" }, { page: "1.5" }, { pageSize: "101" }, { pageSize: "0" }, { q: "x".repeat(101) }, { status: "deleted" }]) expect(() => listQuery(new URLSearchParams(query))).toThrow();
    expect(() => queryParameters({ q: ["A", "B"] })).toThrow();
  });
  it("buyer recebe somente sua projeção pública, sem dados de carteira ou revisão", () => {
    const value = { id, name: "Cliente", document: "ABC", status: "active", revision: 1, contact: { email: "x@example.test", internal_note: "não encaminhar" }, address: {}, seller_membership_id: id, seller_name: "Pessoa", seller_active: true, cost: "1.00", tenant_id: id };
    const buyer = customerDetail(value, "buyer");
    expect(buyer).not.toHaveProperty("sellerId"); expect(buyer).not.toHaveProperty("revision");
    expect(buyer.contact).toEqual({ email: "x@example.test", phone: "" }); expect(buyer).not.toHaveProperty("cost");
    expect(customerDetail(value, "admin").sellerId).toBe(id);
    expect(customerDetail(value, "seller")).not.toHaveProperty("sellerId");
    expect(() => customerDetail({ ...value, contact: [] }, "buyer")).toThrow();
  });
  it("resposta inválida não vira lista vazia nem erro interno público", () => {
    expect(customerPage({ items: [], total: 0, page: 0, page_size: 20 }).total).toBe(0);
    for (const invalid of [null, {}, { items: [], total: -1, page: 0, page_size: 20 }]) expect(() => customerPage(invalid)).toThrow();
    expect(customerMessage("secret_sql_detail")).not.toContain("secret");
    expect(customerMessage("DOCUMENT_IN_USE")).toContain("documento");
  });
});
