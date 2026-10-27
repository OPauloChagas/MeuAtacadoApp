import { describe, expect, it } from "vitest";
import { productInput, productQuery, productDetail, skuValue, photoPath, ProductProblem } from "./contracts";

const id = "00000000-0000-4000-8000-000000000001";
describe("produtos e DTO público",() => {
  it("normaliza SKU e recusa identificadores ambíguos/entradas inválidas",() => {
    expect(skuValue(" cx-50/a_1 ")).toBe("CX-50/A_1");
    for (const value of ["", "a b", "../secret", "á", "a".repeat(65), null]) expect(() => skuValue(value)).toThrow(ProductProblem);
  });
  it("valida unidade e quantidades inteiras sem aceitar controles do ator",() => {
    const form = new FormData(); Object.entries({ sku: "cx50", name: "Caixa", description: "", category: "Salgados", sales_unit: "caixa", package_content: "50 unidades", min_quantity: "2", quantity_multiple: "2", key: id, tenant_id: id, role: "admin" }).forEach(([k,v]) => form.set(k,v));
    const input = productInput(form,false); expect(input.minQuantity).toBe(2); expect(input.sku).toBe("CX50"); expect(input).not.toHaveProperty("tenant_id");
    for (const n of ["0","1.5","-1","1000001","Infinity"]) { form.set("min_quantity",n); expect(() => productInput(form,false)).toThrow(); }
  });
  it("pagina e pesquisa literal; rejeita parâmetros repetidos e limites excessivos",() => {
    expect(productQuery(new URLSearchParams("q=%25_&page=1&pageSize=20")).search).toBe("%_");
    for (const value of ["page=-1","pageSize=101","status=other","q=a&q=b"]) expect(() => productQuery(new URLSearchParams(value))).toThrow();
  });
  it("projeta somente dados do produto sem caminho, preços ou colunas futuras",() => {
    const result = productDetail({ id, sku: "CX", name: "Caixa", category: "", sales_unit: "cx", active: true, revision: 1, photo_path: `${id}/${id}/${id}.webp`, description: "", package_content: "50 unidades", min_quantity: 1, quantity_multiple: 1, cost: "9.99", tenant_id: id, commission: "20" });
    expect(result.hasPhoto).toBe(true); expect(result).not.toHaveProperty("photo_path"); expect(result).not.toHaveProperty("cost"); expect(result).not.toHaveProperty("commission");
    expect(() => photoPath(`other/${id}/${id}.webp`,id,id)).toThrow();
  });
});
