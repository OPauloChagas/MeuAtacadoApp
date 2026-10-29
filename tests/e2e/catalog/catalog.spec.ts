import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { sql, type Fixtures } from "../auth/setup";
import { rpc, actorToken } from "../admin/helpers";
import { login } from "../customers/helpers";
import { upload, storage, succeed } from "../products/helpers";
import type { CatalogFixtures } from "./setup";

const fixtures = () => JSON.parse(process.env.E2E_CATALOG_FIXTURES!) as CatalogFixtures;
const base = () => fixtures().products.customers.base;
const customers = () => fixtures().products.customers;
const buyer = () => ({ p_membership_id: base().memberBuyer });
const item = (quantity = 2, product = fixtures().products.productA) => ({ product_id: product, quantity });
const list = (extra: Record<string, unknown> = {}, actor: keyof Fixtures["actors"] = "buyer") => rpc(actor, "list_catalog", { ...buyer(), ...extra });
const quote = (items: unknown = [item()], extra: Record<string, unknown> = {}) => rpc("buyer", "quote_catalog", { ...buyer(), p_items: items, ...extra });
function assign(list: string | null) {
  sql(`update public.customers set price_list_id=${list ? `'${list}'` : "null"},revision=revision+1 where id='${customers().customerA}';`);
}
const apiHeaders = () => ({ origin: "http://127.0.0.1:3100", "X-Atacado-Context": base().memberBuyer });

test("catálogo projeta somente preço próprio, respeita carteira e contexto duplo", async ({ page }) => {
  const f = fixtures(), c = customers(), p = f.products;
  const own = succeed(await list({ p_page_size: 100 }));
  const rows = own.items as { id: string; unit_price: string }[];
  expect(own.total).toBe(28);
  expect(rows.find(r => r.id === p.productA)?.unit_price).toBe("0.10");
  for (const forbidden of [p.inactive, p.productB, f.hidden]) expect(rows.some(r => r.id === forbidden)).toBe(false);
  expect(Object.keys(own).sort()).toEqual(["availability", "customer", "items", "page", "page_size", "total"]);
  const row = rows.find(r => r.id === p.productA)!;
  expect(Object.keys(row).sort()).toEqual(["id", "sku", "name", "description", "category", "sales_unit", "package_content", "min_quantity", "quantity_multiple", "has_photo", "unit_price"].sort());
  for (const id of [c.customerA2, c.customerB]) expect((await list({ p_customer_id: id })).data.message).toBe("ACCESS_DENIED");
  const other = succeed(await list({ p_membership_id: c.otherBuyer, p_page_size: 100 }, "recovery1440")).items as { id: string; unit_price: string }[];
  expect(other.find(r => r.id === p.productA)!.unit_price).toBe("3.00");
  const tenantB = succeed(await list({ p_membership_id: base().memberMultiB }, "multi")).items as { id: string }[];
  expect(tenantB.map(r => r.id)).toEqual([p.productB]);
  expect(succeed(await list({ p_membership_id: base().memberSeller, p_customer_id: c.customerA }, "seller")).total).toBe(28);
  expect((await list({ p_membership_id: base().memberSeller, p_customer_id: c.customerA2 }, "seller")).data.message).toBe("ACCESS_DENIED");
  expect((await list({ p_membership_id: c.dualSeller, p_customer_id: c.customerA }, "recovery360")).data.message).toBe("ACCESS_DENIED");
  expect(succeed(await list({ p_membership_id: c.dualSeller, p_customer_id: c.customerDual }, "recovery360")).total).toBe(28);
  expect(succeed(await list({ p_membership_id: base().memberAdminA, p_customer_id: c.customerA2 }, "adminA")).total).toBe(29);
  await login(page, "seller"); await page.goto(`/empresa/clientes/${c.customerA}/catalogo`);
  await expect(page.getByRole("heading", { name: "Catálogo", exact: true })).toBeVisible();
  await page.goto(`/empresa/clientes/${c.customerA2}/catalogo`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("indisponível");
});

test("sem fallback; tabela inativa, versão futura, encerrada e rascunho não dão preço", async () => {
  const f = fixtures(), a = base().tenantA;
  try {
    assign(null); expect(succeed(await list()).availability).toBe("unavailable");
    expect((await quote()).data.message).toBe("PRICING_UNAVAILABLE");
    assign(f.listA); sql(`update public.price_lists set active=false where id='${f.listA}';`);
    expect(succeed(await list()).items).toEqual([]);
    expect((await quote()).data.message).toBe("PRICING_UNAVAILABLE");
  } finally { sql(`update public.price_lists set active=true where id='${f.listA}';`); assign(f.listA); }
  for (const state of ["future", "ended", "draft"] as const) {
    const table = randomUUID(), version = randomUUID();
    sql(`begin; insert into public.price_lists(id,tenant_id,name) values('${table}','${a}','Período ${table}');
      insert into public.price_list_versions(id,tenant_id,price_list_id,version,valid_from,valid_until)
      values('${version}','${a}','${table}',1,${state === "future" ? "now()+interval '1 day'" : "now()-interval '2 days'"},${state === "ended" ? "now()-interval '1 day'" : "null"});
      insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) values('${a}','${version}','${f.products.productA}','5.00');
      ${state === "draft" ? "" : `update public.price_list_versions set state='published',published_at=now() where id='${version}';`}
      commit;`);
    try { assign(table); const result = succeed(await list()); expect(result.availability).toBe("unavailable"); expect(result.total).toBe(0); }
    finally { assign(f.listA); }
  }
  // Evaluate at the exact shared statement timestamp: end is exclusive, start inclusive.
  const edgeList = randomUUID(), endVersion = randomUUID(), startVersion = randomUUID();
  sql(`begin; insert into public.price_lists(id,tenant_id,name) values('${edgeList}','${a}','Limite ${edgeList}');
    insert into public.price_list_versions(id,tenant_id,price_list_id,version,valid_from,valid_until) values
    ('${endVersion}','${a}','${edgeList}',1,now()-interval '1 day',statement_timestamp()),
    ('${startVersion}','${a}','${edgeList}',2,statement_timestamp(),null);
    insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) values
    ('${a}','${endVersion}','${f.products.productA}','7.00'),('${a}','${startVersion}','${f.products.productA}','8.00');
    update public.price_list_versions set state='published',published_at=now() where id in ('${endVersion}','${startVersion}');
    update public.customers set price_list_id='${edgeList}' where id='${customers().customerA}';
    set local role authenticated; select set_config('request.jwt.claim.sub','${base().actors.buyer.id}',true);
    do $$ declare result jsonb; begin result:=public.quote_catalog('${base().memberBuyer}','[{"product_id":"${f.products.productA}","quantity":2}]');
    if result->>'total'<>'16.00' then raise exception 'BOUNDARY_FAILED'; end if; end $$; rollback;`);
});

test("quantidades consolidadas, dinheiro exato, limites e mudança de preço exigem revisão", async ({ page }) => {
  const f = fixtures();
  const original = succeed(await quote([item(), item(4)]));
  expect(original.total).toBe("0.60"); expect(original.items).toHaveLength(1);
  expect((original.items as { quantity: number }[])[0]!.quantity).toBe(6);
  expect(succeed(await quote([item(6)], { p_expected_token: original.quote_token })).status).toBe("current");
  expect(succeed(await quote([item(1, f.huge)])).total).toBe("90071992547409.93");
  expect(succeed(await quote([item(100, f.huge)])).total).toBe("9007199254740993.00");
  expect((await quote([item(112, f.huge)])).data.message).toBe("AMOUNT_LIMIT");
  for (const quantity of [1, 3]) expect((await quote([item(quantity)])).data.message).toBe("QUANTITY_INVALID");
  expect(succeed(await quote([item(1000000)])).total).toBe("100000.00");
  expect(succeed(await quote(Array.from({ length: 200 }, () => item()))).total).toBe("40.00");
  expect((await quote([item(1000000), item(2)])).data.message).toBe("QUANTITY_INVALID");
  for (const payload of [null, {}, [], Array.from({ length: 201 }, () => item()), [{ ...item(), unit_price: "0.01" }], [null], [{ product_id: f.second, quantity: "2" }], [item(0)], [item(-1)], [item(1.5)], [item(1000001)]]) {
    expect((await quote(payload)).data.message).toBe("VALIDATION_ERROR");
  }
  for (const product of [f.products.productB, f.hidden, f.products.inactive, randomUUID()]) expect((await quote([item(2, product)])).data.message).toBe("PRODUCT_UNAVAILABLE");
  await login(page, "buyer");
  const simulated = await page.request.post("/api/catalog", { headers: apiHeaders(), data: { items: [item(6)] } });
  expect(simulated.status()).toBe(200); const old = (await simulated.json()).data;
  try {
    assign(f.listNext);
    const changed = await page.request.post("/api/catalog", { headers: apiHeaders(), data: { items: [item(6)], expectedToken: old.token } });
    expect(changed.status()).toBe(409); const fresh = await changed.json();
    expect(fresh.error.code).toBe("PRICE_CHANGED"); expect(fresh.data.total).toBe("1.20");
    expect(fresh.data.token).not.toBe(old.token);
    const reviewed = await page.request.post("/api/catalog", { headers: apiHeaders(), data: { items: [item(6)], expectedToken: fresh.data.token } });
    expect(reviewed.status()).toBe(200); expect((await reviewed.json()).data.status).toBe("current");
  } finally { assign(f.listA); }
});

test("UI por teclado simula, preserva erros e descarta seleção ao buscar e paginar", async ({ page }) => {
  const f = fixtures();
  await login(page, "buyer"); await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await page.getByLabel("Buscar por nome ou SKU").fill("BASE-A");
  await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
  const quantity = page.getByLabel(`Quantidade de ${f.products.nameA}`, { exact: true });
  await expect(quantity).toBeEnabled(); await quantity.fill("6"); await quantity.press("Tab");
  await page.getByRole("button", { name: "Calcular simulação", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByText("Total: R$ 0,60", { exact: true })).toBeVisible();
  try {
    assign(f.listNext); await page.getByRole("button", { name: "Calcular simulação", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("mudaram");
    await expect(page.getByText("Total: R$ 1,20", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Revisar simulação", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  } finally { assign(f.listA); }
  await quantity.fill("3"); await page.getByRole("button", { name: "Calcular simulação", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("múltiplo"); await expect(quantity).toHaveValue("3");
  await page.getByLabel("Buscar por nome ou SKU").fill(f.prefix);
  await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
  await expect(page.locator(".catalog-card")).toHaveCount(20);
  await expect(page.getByRole("region", { name: "Resultado da simulação" })).toHaveCount(0);
  await page.locator('.catalog-card input').first().fill("4"); await page.getByRole("link", { name: "Próxima", exact: true }).click();
  await expect(page.locator(".catalog-card")).toHaveCount(5);
  await page.getByRole("link", { name: "Anterior", exact: true }).click();
  await expect(page.locator('.catalog-card input').first()).toHaveValue("");
  await page.getByLabel("Buscar por nome ou SKU").fill("%_"); await page.getByRole("button", { name: "Buscar produtos", exact: true }).click();
  await expect(page.getByText("Nenhum produto disponível com os filtros atuais.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("fotos reais: projeção opaca, Storage privado e revogação imediata", async ({ page }) => {
  const f = fixtures(), product = f.products.productA;
  const bytes = await sharp({ create: { width: 16, height: 12, channels: 3, background: "red" } }).webp().toBuffer();
  const uploaded = await upload(product, bytes), path = uploaded.ticket.object_path;
  const otherPhoto = await upload(f.hidden, bytes);
  expect((await storage("buyer", `object/authenticated/product-photos/${otherPhoto.ticket.object_path}`)).ok).toBe(false);
  expect((await storage("recovery1440", `object/authenticated/product-photos/${otherPhoto.ticket.object_path}`)).ok).toBe(true);
  expect((await rpc("buyer", "get_catalog_photo", { ...buyer(), p_product_id: f.hidden })).data.message).toBe("PHOTO_UNAVAILABLE");
  const reference = succeed(await rpc("buyer", "get_catalog_photo", { ...buyer(), p_product_id: product }));
  expect(Object.keys(reference).sort()).toEqual(["photo_id", "product_id"]);
  expect((await storage("buyer", `object/authenticated/product-photos/${path}`)).ok).toBe(true);
  expect((await storage("recovery1440", `object/authenticated/product-photos/${path}`)).ok).toBe(true);
  for (const actor of ["adminB"] as const) expect((await storage(actor, `object/authenticated/product-photos/${path}`)).ok).toBe(false);
  expect((await storage("buyer", `object/sign/product-photos/${path}`, "POST", { expiresIn: 60 })).ok).toBe(false);
  expect(await (await storage("buyer", "object/list/product-photos", "POST", { prefix: base().tenantA })).json()).toEqual([]);
  expect((await storage("buyer", `object/product-photos/${path}`, "POST", bytes)).ok).toBe(false);
  expect((await storage("buyer", `object/product-photos/${path}`, "DELETE")).ok).toBe(false);
  expect((await fetch(`http://127.0.0.1:54321/storage/v1/object/public/product-photos/${path}`)).ok).toBe(false);
  await login(page, "buyer"); await page.goto("/cliente/catalogo?q=BASE-A");
  await expect(page.getByRole("img", { name: `Foto de ${f.products.nameA}` })).toBeVisible();
  const response = await page.request.get(`/api/catalog/${product}/photo`);
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff"); expect(response.headers()["content-type"]).toBe("image/webp");
  expect((await sharp(await response.body()).metadata()).format).toBe("webp");
  try {
    assign(null);
    expect((await storage("buyer", `object/authenticated/product-photos/${path}`)).ok).toBe(false);
    expect((await page.request.get(`/api/catalog/${product}/photo`)).status()).toBe(404);
  } finally { assign(f.listA); }
  for (const [table, column, value, restore, key] of [
    ["memberships", "status", "inactive", "active", base().memberBuyer],
    ["customers", "status", "inactive", "active", customers().customerA],
    ["tenants", "status", "inactive", "active", base().tenantA],
    ["profiles", "status", "inactive", "active", base().actors.buyer.id],
    ["price_lists", "active", "false", "true", f.listA],
    ["products", "active", "false", "true", product],
  ]) {
    const selector = table === "profiles" ? "user_id" : "id";
    sql(`update public.${table} set ${column}='${value}' where ${selector}='${key}';`);
    try {
      expect((await storage("buyer", `object/authenticated/product-photos/${path}`)).ok).toBe(false);
      expect((await quote()).status).not.toBe(200);
      expect((await page.request.get(`/api/catalog/${product}/photo`)).status()).not.toBe(200);
    } finally { sql(`update public.${table} set ${column}='${restore}' where ${selector}='${key}';`); }
  }
  sql(`update public.customers set seller_membership_id=null where id='${customers().customerA}';`);
  try { expect((await list({ p_membership_id: base().memberSeller, p_customer_id: customers().customerA }, "seller")).data.message).toBe("ACCESS_DENIED"); }
  finally { sql(`update public.customers set seller_membership_id='${base().memberSeller}' where id='${customers().customerA}';`); }
});

test("HTTP e dados diretos negam campos forjados, helpers, comissão, DML e contexto obsoleto", async ({ page, request }) => {
  await login(page, "buyer");
  for (const data of [null, [], { items: [null] }, { items: [item()], tenantId: base().tenantB }, { items: [{ ...item(), unitPrice: "0.01" }] }, { items: [item()], expectedToken: "x" }]) {
    const result = await page.request.post("/api/catalog", { headers: { ...apiHeaders(), "Content-Type": "application/json" }, data: JSON.stringify(data) });
    expect(result.status()).toBe(422);
  }
  expect((await page.request.post("/api/catalog", { headers: apiHeaders(), data: "x".repeat(65537) })).status()).toBe(422);
  expect((await page.request.post("/api/catalog", { headers: { ...apiHeaders(), origin: "https://external.invalid" }, data: { items: [item()] } })).status()).toBe(403);
  expect((await page.request.post("/api/catalog", { headers: { ...apiHeaders(), "X-Atacado-Context": base().memberMultiB }, data: { items: [item()] } })).status()).toBe(403);
  expect((await page.request.get(`/api/catalog?customerId=${customers().customerA2}`)).status()).toBe(403);
  for (const query of ["pageSize=101", "q=a&q=b", "category=x&category=y"]) expect((await page.request.get(`/api/catalog?${query}`)).status()).toBe(422);
  const response = await page.request.get("/api/catalog"); expect(response.headers()["cache-control"]).toContain("no-store");
  const body = (await response.json()).data;
  expect(Object.keys(body.items[0]).sort()).toEqual(["id", "sku", "name", "description", "category", "salesUnit", "packageContent", "minimum", "multiple", "hasPhoto", "unitPrice"].sort());
  for (const actor of ["adminA", "seller", "buyer"] as const) {
    const headers = { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${await actorToken(actor)}` };
    for (const table of ["products", "product_photos", "price_lists", "price_list_versions", "price_list_items", "commission_tables", "commission_versions", "commission_items", "payment_terms", "seller_commission_assignments"]) {
      expect((await request.get(`http://127.0.0.1:54321/rest/v1/${table}?select=*`, { headers })).status()).toBe(403);
      for (const method of ["POST", "PATCH", "DELETE"]) {
        const result = await request.fetch(`http://127.0.0.1:54321/rest/v1/${table}${method === "POST" ? "" : `?id=eq.${fixtures().products.productA}`}`, { headers, method, ...(method === "DELETE" ? {} : { data: { tenant_id: base().tenantA } }) });
        expect(result.status(), `${table} ${method}: ${(await result.json()).code}`).toBe(403);
      }
    }
    for (const name of ["catalog_context", "catalog_product_allowed", "catalog_list_allowed"]) expect((await rpc(actor, name, {})).status).toBe(404);
  }
  const anon = await request.post("http://127.0.0.1:54321/rest/v1/rpc/list_catalog", { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, data: buyer() });
  expect([401, 403]).toContain(anon.status());
  expect(sql("select bool_and(provolatile='s') from pg_proc where pronamespace='public'::regnamespace and proname in ('list_catalog','quote_catalog','get_catalog_photo');")).toBe("t");
});

test("buscas, categoria literal, paginação e leituras concorrentes não escrevem fatos", async () => {
  const f = fixtures();
  for (const search of ["%_", f.products.inactiveName, "HIDDEN", f.products.nameB]) expect(succeed(await list({ p_search: search })).total).toBe(0);
  expect(succeed(await list({ p_category: "%_" })).total).toBe(1);
  expect(succeed(await list({ p_category: "Categoria secreta" })).total).toBe(0);
  const pages = await Promise.all([0, 1].map(page => list({ p_search: f.prefix, p_page: page, p_page_size: 20 })));
  expect(pages.map(p => p.data.total)).toEqual([25, 25]);
  const ids = pages.flatMap(p => p.data.items.map((i: { id: string }) => i.id));
  expect(new Set(ids).size).toBe(25);
  for (const input of [{ p_page_size: 101 }, { p_page: -1 }, { p_search: null }, { p_category: null }]) expect((await list(input)).data.message).toBe("VALIDATION_ERROR");
  const count = () => sql(`select json_build_array((select count(*) from public.audit_events where tenant_id='${base().tenantA}'),(select count(*) from public.idempotency_keys where tenant_id='${base().tenantA}'));`);
  const before = count(), results = await Promise.all(Array.from({ length: 8 }, () => quote()));
  expect(results.every(r => r.status === 200)).toBe(true);
  expect(new Set(results.map(r => r.data.quote_token)).size).toBe(1); expect(count()).toBe(before);
});

test("alteração comercial concorrente mantém snapshot completo, troca de acesso limpa UI", async ({ page }) => {
  const f = fixtures(), run = promisify(execFile);
  const first = succeed(await quote([item(), item(1, f.second)]));
  const sqlArgs = ["exec", "-i", "supabase_db_meuatacado-local", "psql", "--no-psqlrc", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1", "-c"];
  try {
    const writer = run("docker", [...sqlArgs, `begin; update public.customers set price_list_id='${f.listNext}',revision=revision+1 where id='${customers().customerA}'; select pg_sleep(0.2); commit;`]);
    const reads = await Promise.all(Array.from({ length: 10 }, () => quote([item(), item(1, f.second)])));
    await writer;
    reads.push(await quote([item(), item(1, f.second)]));
    for (const result of reads) {
      const data = succeed(result), lines = data.items as { product_id: string; unit_price: string }[];
      const prices = [f.products.productA, f.second].map(id => lines.find(l => l.product_id === id)!.unit_price);
      expect([JSON.stringify(["0.10", "1.11"]), JSON.stringify(["0.20", "2.22"])]).toContain(JSON.stringify(prices));
      expect(["1.31", "2.62"]).toContain(data.total);
    }
    expect(reads.at(-1)!.data.quote_token).not.toBe(first.quote_token);
  } finally { assign(f.listA); }
  await login(page, "multi", "A"); await page.goto("/cliente/catalogo?q=BASE-A");
  await page.getByLabel(`Quantidade de ${f.products.nameA}`, { exact: true }).fill("4");
  await page.getByRole("link", { name: "Trocar acesso", exact: true }).click();
  await page.getByRole("radio", { name: new RegExp(base().companyB) }).check();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.goto("/cliente/catalogo");
  await expect(page.getByRole("heading", { name: f.products.nameB, exact: true })).toBeVisible();
  await expect(page.getByLabel(`Quantidade de ${f.products.nameA}`, { exact: true })).toHaveCount(0);
  expect((await page.request.post("/api/catalog", { headers: { ...apiHeaders(), "X-Atacado-Context": base().memberMultiA }, data: { items: [item()] } })).status()).toBe(403);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  expect((await page.request.get("/api/catalog")).status()).toBe(401);
});
