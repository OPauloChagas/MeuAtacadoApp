import { describe, expect, it } from "vitest";
import { dashboardPath, parseContext, readEmail, readPassword, readRecoveryHash } from "./contracts";

const valid = { membership_id: "00000000-0000-4000-8000-000000000001", tenant_id: "00000000-0000-4000-8000-000000000002", company_name: "Fornecedor", role: "admin", customer_id: null, customer_name: null };
describe("entradas e projeção de identidade", () => {
  it("aceita hash Auth e prefixo PKCE, sem aceitar URL, lista ou conteúdo arbitrário", () => {
    for (const token of ["a".repeat(56), `pkce_${"b".repeat(56)}`]) expect(readRecoveryHash(token)).toBe(token);
    for (const token of [null, ["a".repeat(56)], "https://example.test", "pkce_", "z".repeat(56), "a".repeat(129)]) expect(readRecoveryHash(token)).toBeNull();
  });
  it("normaliza e-mail, sem aceitar arquivo ou endereço inválido", () => {
    expect(readEmail("  Nome@Example.test ")).toBe("nome@example.test");
    for (const value of [null, "x", "x@x", "x y@example.test", `${"x".repeat(255)}@x.test`, new File([], "email")]) expect(readEmail(value)).toBeNull();
  });
  it("preserva a senha e impõe limites no servidor", () => {
    expect(readPassword("  senha  ")).toBe("  senha  ");
    expect(readPassword("curta", 12)).toBeNull();
    expect(readPassword("x".repeat(129))).toBeNull();
    expect(readPassword(null)).toBeNull();
    expect(readPassword("x".repeat(12), 12)).toBe("x".repeat(12));
  });
  it("rejeita projeções inconsistentes sem confiar no papel do navegador", () => {
    for (const value of [null, {}, { ...valid, role: "owner" }, { ...valid, membership_id: "forjado" }, { ...valid, role: "buyer" }, { ...valid, customer_id: 42 }]) expect(() => parseContext(value)).toThrow();
    expect(parseContext({ ...valid, secret: "não encaminhar" })).toEqual(valid);
    expect(dashboardPath("admin")).toBe("/empresa/inicio");
    expect(dashboardPath("seller")).toBe("/empresa/inicio");
    expect(dashboardPath("buyer")).toBe("/cliente/inicio");
  });
});
