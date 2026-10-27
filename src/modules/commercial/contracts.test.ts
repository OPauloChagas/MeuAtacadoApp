import { describe,it,expect } from "vitest";
import { decimal,brl,calendarDate,query,tableRow,versionRow,CommercialProblem } from "./contracts";
describe("contratos comerciais exatos",() => {
 it("preserva centavos além da precisão binária e aceita vírgula sem agrupamento",() => {
  expect(decimal("90071992547409,93")).toBe("90071992547409.93");
  expect(brl("90071992547409.93")).toBe("R$ 90.071.992.547.409,93");
  expect(decimal("9999999999999999.99")).toBe("9999999999999999.99");
  expect(decimal("000012,5")).toBe("12.50");
 });
 it("não arredonda nem aceita números JSON, expoente ou formatos ambíguos",() => {
  for (const value of [0,12.34,"0","-1","1.001","NaN","Infinity","1e2","1.000,00","10000000000000000.00",null,{},".5"]) expect(() => decimal(value)).toThrow(CommercialProblem);
 });
 it("percentual permite zero e 100 explícitos e quatro casas exatas",() => {
  expect(decimal("0",true)).toBe("0.0000"); expect(decimal("100",true)).toBe("100.0000"); expect(decimal("12,3456",true)).toBe("12.3456");
  for (const value of [0,"100.0001","1.23456","-0.0001",null]) expect(() => decimal(value,true)).toThrow();
 });
 it("datas de calendário não dependem do fuso do navegador e rejeitam normalização silenciosa",() => {
  expect(calendarDate("2028-02-29")).toBe("2028-02-29"); expect(calendarDate("")).toBeNull();
  for (const value of ["2027-02-29","2027-13-01","2028-01-01T00:00:00Z","01/01/2028",0]) expect(() => calendarDate(value)).toThrow();
 });
 it("DTOs explícitos não incluem coluna futura e percentuais seguem strings",() => {
  const id = "00000000-0000-4000-8000-000000000001";
  expect(tableRow({ id,name: "Atacado",active: true,revision: 1,secret_cost: "20.00" })).not.toHaveProperty("secret_cost");
  expect(versionRow({ id,version: 1,state: "published",valid_from: "2028-01-01T03:00:00Z",valid_until: null,revision: 2,default_rate: "0.0000" }).defaultRate).toBe("0.0000");
 });
 it("paginação e busca literal são limitadas e sem parâmetros duplicados",() => {
  expect(query(new URLSearchParams("q=%25_&page=1&pageSize=20")).search).toBe("%_");
  for (const value of ["page=-1","pageSize=101","q=a&q=b","status=any"]) expect(() => query(new URLSearchParams(value))).toThrow();
 });
});
