import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sql } from "../auth/setup";
import { base, fixtures, login, rpc, actorToken, createPayload, create, detail, editPayload, storage, prepare, activate, upload, succeed } from "./helpers";

const webp = () => sharp({ create: { width: 16, height: 12, channels: 3, background: "red" } }).webp().toBuffer();
const member = () => ({ p_membership_id: base().memberAdminA });

test("admin cadastra e edita produto, preserva campos em duplicata e pesquisa por SKU",async ({ page }) => {
  await login(page,"adminA"); await page.getByRole("link",{ name: "Produtos",exact: true }).click();
  await page.getByRole("link",{ name: "Novo produto",exact: true }).click();
  await expect(page.getByLabel(/^SKU/)).toBeEnabled();
  const sku = `CX-${randomUUID().slice(0,8)}`;
  await page.getByLabel(/^SKU/).fill(sku.toLowerCase()); await page.getByLabel(/^SKU/).press("Tab"); await expect(page.getByLabel("Nome do produto",{ exact: false })).toBeFocused(); await page.getByLabel("Nome do produto",{ exact: false }).fill("Caixa de coxinhas fictícias");
  await page.getByLabel("Categoria",{ exact: true }).fill("Salgados"); await page.getByLabel("Conteúdo da embalagem",{ exact: true }).fill("50 unidades");
  await page.getByLabel("Quantidade mínima",{ exact: false }).fill("2"); await page.getByLabel("Múltiplo de venda",{ exact: false }).fill("2");
  expect(await page.locator("form").last().evaluate(form => [...form.querySelectorAll("input,textarea")].filter(element => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement).filter(element => !element.checkValidity()).map(element => ({ name: element.name, value: element.value, problem: element.validationMessage })))).toEqual([]);
  const posted = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/empresa/produtos/novo");
  await page.getByRole("button",{ name: "Cadastrar produto",exact: true }).focus(); await page.keyboard.press("Enter");
  await posted;
  await expect(page).toHaveURL(/\/empresa\/produtos\/[0-9a-f-]+\?salvo=1$/);
  await expect(page.getByLabel("Descrição",{ exact: true })).toBeEnabled();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Produto salvo"); await expect(page.locator("dd").filter({ hasText: sku })).toHaveCount(1);
  await page.getByLabel("Descrição",{ exact: true }).fill("Descrição atualizada"); await page.getByRole("button",{ name: "Salvar alterações",exact: true }).click();
  await expect(page.getByText("Descrição atualizada",{ exact: true })).toBeVisible();
  await page.goto("/empresa/produtos/novo"); await expect(page.getByLabel(/^SKU/)).toBeEnabled(); await page.getByLabel(/^SKU/).fill(` ${sku.toLowerCase()} `); await page.getByLabel("Nome do produto",{ exact: false }).fill("Nome preservado");
  await page.getByRole("button",{ name: "Cadastrar produto",exact: true }).click(); await expect(page.getByRole("main").getByRole("alert")).toContainText("Já existe um produto"); await expect(page.getByLabel("Nome do produto",{ exact: false })).toHaveValue("Nome preservado");
  await page.goto("/empresa/produtos"); await page.getByLabel("Buscar por nome ou SKU").fill(sku); await page.getByRole("button",{ name: "Buscar produtos",exact: true }).click(); await expect(page.locator("li.admin-item")).toHaveCount(1);
  await page.keyboard.press("Tab"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("seller lê somente ativos; buyer, outro tenant e contexto seller duplo não ganham escrita",async ({ page }) => {
  const f = fixtures(); await login(page,"seller"); await page.goto(`/empresa/produtos?q=${encodeURIComponent(f.nameA)}`); await expect(page.getByRole("link",{ name: f.nameA,exact: true })).toBeVisible();
  await expect(page.getByText(f.inactiveName,{ exact: true })).toHaveCount(0); await expect(page.getByText(f.nameB,{ exact: true })).toHaveCount(0); await expect(page.getByRole("link",{ name: "Novo produto",exact: true })).toHaveCount(0);
  await page.goto(`/empresa/produtos/${f.productA}`); await expect(page.getByRole("heading",{ name: f.nameA,exact: true })).toBeVisible(); await expect(page.getByRole("button",{ name: "Salvar alterações" })).toHaveCount(0);
  for (const id of [f.productB,f.inactive]) expect((await page.request.get(`/api/products/${id}`)).status()).toBe(403);
  expect((await page.request.post(`/api/products/${f.productA}/photo`,{ headers: { origin: "http://127.0.0.1:3100" },multipart: { operation: "cleanup" } })).status()).toBe(403);
  await login(page,"buyer"); await page.goto("/empresa/produtos"); await expect(page).toHaveURL(/\/acesso-negado$/); expect((await page.request.get(`/api/products/${f.productA}`)).status()).toBe(403);
  await login(page,"recovery360","seller"); await page.goto("/empresa/produtos/novo"); await expect(page).toHaveURL(/\/acesso-negado$/);
  const denied = await rpc("recovery360","create_product",{ ...createPayload(),p_membership_id: f.customers.dualSeller }); expect(denied.data.message).toBe("ACCESS_DENIED");
});

test("RPCs preservam tenant, SKU, revisão, repetição, auditoria e grants sob concorrência",async ({ request }) => {
  const payload = createPayload(); const repeated = await Promise.all([rpc("adminA","create_product",payload),rpc("adminA","create_product",payload)]); expect(repeated[0].data).toEqual(repeated[1].data);
  const id = succeed(repeated[0]!).product_id as string; expect(sql(`select count(*) from public.audit_events where request_id='${payload.p_idempotency_key}' and action='product.created'`)).toBe("1");
  expect((await rpc("adminA","create_product",{ ...payload,p_name: "Outro" })).data.message).toBe("IDEMPOTENCY_CONFLICT");
  const sku = `RACE-${randomUUID()}`, race = await Promise.all([rpc("adminA","create_product",createPayload(sku)),rpc("adminA","create_product",createPayload(sku.toLowerCase()))]); expect(race.filter(r => r.status === 200)).toHaveLength(1); expect(race.find(r => r.status !== 200)!.data.message).toBe("SKU_IN_USE");
  succeed(await rpc("adminB","create_product",{ ...createPayload(sku),p_membership_id: base().memberAdminB }));
  const edit = await editPayload(id), editCommands = [{ ...edit,p_name: "Primeiro" },{ ...edit,p_name: "Segundo",p_idempotency_key: randomUUID() }];
  const edits = await Promise.all(editCommands.map(command => rpc("adminA","update_product",command))); expect(edits.filter(r => r.status === 200)).toHaveLength(1); expect(edits.find(r => r.status !== 200)!.data.message).toBe("STALE_VERSION");
  const winner = edits.findIndex(r => r.status === 200); expect((await rpc("adminA","update_product",editCommands[winner]!)).data).toEqual(edits[winner]!.data);
  for (const actor of ["seller","buyer"] as const) expect((await rpc(actor,"create_product",{ ...createPayload(),p_membership_id: actor === "seller" ? base().memberSeller : base().memberBuyer })).data.message).toBe("ACCESS_DENIED");
  expect((await rpc("adminB","get_product",{ p_membership_id: base().memberAdminB,p_product_id: id })).data.message).toBe("ACCESS_DENIED");
  for (const quantity of [0,-1,1000001]) expect((await rpc("adminA","create_product",{ ...createPayload(),p_min_quantity: quantity })).data.message).toBe("VALIDATION_ERROR");
  const failing = createPayload(); sql(`create function private.fail_product_test() returns trigger language plpgsql as $$ begin if new.request_id='${failing.p_idempotency_key}' then raise exception 'TEST_AUDIT_FAILURE'; end if; return new; end $$; create trigger fail_product_test before insert on public.audit_events for each row execute function private.fail_product_test();`);
  try { expect((await rpc("adminA","create_product",failing)).status).not.toBe(200); expect(sql(`select count(*) from public.products where tenant_id='${base().tenantA}' and sku='${failing.p_sku}'`)).toBe("0"); expect(sql(`select count(*) from public.idempotency_keys where key='${failing.p_idempotency_key}'`)).toBe("0"); }
  finally { sql("drop trigger fail_product_test on public.audit_events; drop function private.fail_product_test();"); }
  for (const actor of ["adminA","seller","buyer"] as const) {
    const headers = { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,Authorization: `Bearer ${await actorToken(actor)}` };
    for (const table of ["products","product_photos"]) {
      expect((await request.get(`http://127.0.0.1:54321/rest/v1/${table}?select=*`,{ headers })).status()).toBe(403);
      for (const method of ["POST","PATCH","DELETE"]) { const r = await request.fetch(`http://127.0.0.1:54321/rest/v1/${table}${method === "POST" ? "" : `?id=eq.${id}`}`,{ method,headers,...(method === "DELETE" ? {} : { data: table === "products" ? { name: "Ataque" } : { state: "active" } }) }); expect(r.status()).toBe(403); expect((await r.json()).code).toBe("42501"); }
    }
  }
  const anon = await request.post("http://127.0.0.1:54321/rest/v1/rpc/get_product",{ headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },data: { ...member(),p_product_id: id } }); expect([401,403]).toContain(anon.status());
  const prefix = `PAG-${randomUUID().slice(0,8).toUpperCase()}`;
  sql(`insert into public.products(tenant_id,sku,name,sales_unit) select '${base().tenantA}','${prefix}-'||n,'${prefix} '||lpad(n::text,2,'0'),'unidade' from generate_series(1,25) n; insert into public.products(tenant_id,sku,name,sales_unit) values('${base().tenantB}','${prefix}-B','${prefix} estrangeiro','unidade');`);
  const pages = await Promise.all([0,1].map(page => rpc("adminA","list_products",{ ...member(),p_search: prefix,p_page: page,p_page_size: 10 })));
  expect(pages.map(p => p.data.total)).toEqual([25,25]); expect(pages[0]!.data.items).toHaveLength(10); expect(pages[1]!.data.items).toHaveLength(10); expect(pages[0]!.data.items.some((a: { id: string }) => pages[1]!.data.items.some((b: { id: string }) => a.id === b.id))).toBe(false);
  expect((await rpc("adminA","list_products",{ ...member(),p_search: "%_" })).data.total).toBe(0);
  expect((await rpc("adminA","list_products",{ ...member(),p_page_size: 101 })).data.message).toBe("VALIDATION_ERROR");
  expect((await rpc("seller","list_products",{ p_membership_id: base().memberSeller,p_status: "all" })).data.message).toBe("ACCESS_DENIED");
  expect((await rpc("buyer","list_products",{ p_membership_id: base().memberBuyer })).data.message).toBe("ACCESS_DENIED");
});

test("foto real sobe sem metadados, pode ser substituída e removida pela interface",async ({ page }) => {
  const id = await create(); await login(page,"adminA"); await page.goto(`/empresa/produtos/${id}`);
  const jpeg = await sharp({ create: { width: 32,height: 24,channels: 3,background: "red" } }).jpeg().withExif({ IFD0: { Artist: "Fixture" } }).toBuffer();
  await page.getByLabel("Foto do produto",{ exact: true }).setInputFiles({ name: "produto.jpg",mimeType: "image/jpeg",buffer: jpeg }); await page.getByRole("button",{ name: "Enviar foto",exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/empresa/produtos/${id}\\?foto=salva$`)); await expect(page.getByRole("img")).toBeVisible();
  const response = await page.request.get(`/api/products/${id}/photo`); expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toContain("no-store"); expect(response.headers()["x-content-type-options"]).toBe("nosniff"); expect(response.headers()["content-type"]).toBe("image/webp"); expect((await sharp(await response.body()).metadata()).exif).toBeUndefined();
  const oldPath = (await detail(id)).photo_path;
  const png = await sharp({ create: { width: 24,height: 24,channels: 3,background: "blue" } }).png().toBuffer(); await page.getByLabel("Foto do produto",{ exact: true }).setInputFiles({ name: "novo.png",mimeType: "image/png",buffer: png }); await page.getByRole("button",{ name: "Substituir foto",exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/empresa/produtos/${id}\\?foto=salva$`));
  await expect.poll(async () => (await detail(id)).photo_path).not.toBe(oldPath);
  expect((await storage("adminA",`object/authenticated/product-photos/${oldPath}`)).ok).toBe(false);
  await page.getByRole("button",{ name: "Remover foto",exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/empresa/produtos/${id}\\?foto=removida$`)); await expect(page.getByText("Este produto ainda não tem foto.",{ exact: true })).toBeVisible(); expect((await page.request.get(`/api/products/${id}/photo`)).status()).toBe(404);
});

test("upload recusa conteúdo falso, MIME divergente, excesso de bytes e Origin externo",async ({ page }) => {
  const id = await create(); await login(page,"adminA"); const revision = String((await detail(id)).revision);
  const cases = [ { buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),mimeType: "image/png",status: 422 }, { buffer: await webp(),mimeType: "image/jpeg",status: 422 }, { buffer: Buffer.alloc(3_000_001),mimeType: "image/png",status: 413 } ];
  for (const value of cases) { const r = await page.request.post(`/api/products/${id}/photo`,{ headers: { origin: "http://127.0.0.1:3100" },multipart: { operation: "upload",revision,key: randomUUID(),photo: { name: "foto.png",mimeType: value.mimeType,buffer: value.buffer } } }); expect(r.status()).toBe(value.status); }
  expect((await page.request.post(`/api/products/${id}/photo`,{ headers: { origin: "https://external.invalid" },multipart: { operation: "cleanup" } })).status()).toBe(403);
  expect(sql(`select count(*) from public.product_photos where product_id='${id}'`)).toBe("0");
});

test("Storage real exige reserva e JWT vigente; bloqueia assinatura, overwrite e outros escopos",async () => {
  const id = await create(), bytes = await webp(), p = await prepare(id,bytes), path = p.ticket.object_path;
  expect((await activate(id,p)).data.message).toBe("PHOTO_UNAVAILABLE");
  expect((await storage("seller",`object/product-photos/${path}`,"POST",bytes)).ok).toBe(false);
  expect((await storage("adminB",`object/product-photos/${path}`,"POST",bytes)).ok).toBe(false);
  expect((await storage("adminA",`object/product-photos/${base().tenantA}/${id}/${randomUUID()}.webp`,"POST",bytes)).ok).toBe(false);
  expect((await storage("adminA",`object/upload/sign/product-photos/${path}`,"POST",{})).ok).toBe(false);
  expect((await storage("adminA",`object/product-photos/${path}`,"POST",bytes)).status).toBe(200);
  expect((await storage("seller",`object/authenticated/product-photos/${path}`)).ok).toBe(false);
  const activation = await Promise.all([activate(id,p),activate(id,p)]); expect(activation[0].data).toEqual(activation[1].data); succeed(activation[0]!);
  expect((await storage("seller",`object/authenticated/product-photos/${path}`)).status).toBe(200);
  for (const actor of ["adminB","buyer"] as const) expect((await storage(actor,`object/authenticated/product-photos/${path}`)).ok).toBe(false);
  expect((await storage("adminA",`object/product-photos/${path}`,"POST",bytes,{ "x-upsert": "true" })).ok).toBe(false);
  for (const actor of ["seller","adminA"] as const) expect((await storage(actor,`object/sign/product-photos/${path}`,"POST",{ expiresIn: 60 })).ok).toBe(false);
  expect((await fetch(`http://127.0.0.1:54321/storage/v1/object/authenticated/product-photos/${path}`,{ headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! } })).ok).toBe(false);
  const listing = await storage("adminA","object/list/product-photos","POST",{ prefix: base().tenantA,limit: 100 }); expect(await listing.json()).toEqual([]);
  expect((await storage("adminA","object/copy","POST",{ bucketId: "product-photos",sourceKey: path,destinationKey: `${base().tenantA}/${id}/${randomUUID()}.webp` })).ok).toBe(false);
  sql(`update public.memberships set status='inactive' where id='${base().memberSeller}'`);
  try { expect((await storage("seller",`object/authenticated/product-photos/${path}`)).ok).toBe(false); expect((await rpc("seller","get_product",{ p_membership_id: base().memberSeller,p_product_id: id })).data.message).toBe("ACCESS_DENIED"); }
  finally { sql(`update public.memberships set status='active' where id='${base().memberSeller}'`); }
  succeed(await rpc("adminA","update_product",await editPayload(id,{ p_active: false }))); expect((await storage("seller",`object/authenticated/product-photos/${path}`)).ok).toBe(false);
  const next = await prepare(id,bytes); sql(`update public.product_photos set expires_at=now()-interval '1 second' where id='${next.ticket.photo_id}'`);
  expect((await storage("adminA",`object/product-photos/${next.ticket.object_path}`,"POST",bytes)).ok).toBe(false); expect((await activate(id,next)).data.message).toBe("PHOTO_UNAVAILABLE");
  expect((await rpc("seller","retire_product_photo",{ p_membership_id: base().memberSeller,p_product_id: id })).data.message).toBe("ACCESS_DENIED");
  expect((await rpc("adminA","finish_product_photo_cleanup",{ ...member(),p_product_id: id,p_photo_ids: [p.ticket.photo_id] })).data.message).toBe("ACCESS_DENIED");
  const retired = succeed(await rpc("adminA","retire_product_photo",{ ...member(),p_product_id: id })) as unknown as { id: string; object_path: string }[]; expect(retired.some(item => item.id === next.ticket.photo_id)).toBe(true);
  let constraint = false; try { sql(`update public.products set photo_id='${p.ticket.photo_id}' where id='${fixtures().productB}'`); } catch { constraint = true; } expect(constraint).toBe(true);
  succeed(await rpc("adminA","update_product",await editPayload(id,{ p_active: true }))); expect((await storage("seller",`object/authenticated/product-photos/${path}`)).status).toBe(200);
});

test("falha de auditoria na foto preserva a anterior; revisão stale e arquivo forjado não são publicados",async ({ page }) => {
  const id = await create(), bytes = await webp(), first = await upload(id,bytes); await login(page,"adminA");
  const current = await detail(id), key = randomUUID();
  sql(`create function private.fail_photo_test() returns trigger language plpgsql as $$ begin if new.request_id='${key}' and new.action='product.photo_changed' then raise exception 'TEST_PHOTO_AUDIT'; end if; return new; end $$; create trigger fail_photo_test before insert on public.audit_events for each row execute function private.fail_photo_test();`);
  try {
    const r = await page.request.post(`/api/products/${id}/photo`,{ headers: { origin: "http://127.0.0.1:3100" },multipart: { operation: "upload",revision: String(current.revision),key,photo: { name: "foto.webp",mimeType: "image/webp",buffer: bytes } } }); expect(r.status()).toBe(503);
    expect((await detail(id)).photo_path).toBe(first.ticket.object_path); expect(sql(`select count(*) from public.idempotency_keys where operation='set_product_photo' and key='${key}'`)).toBe("0");
  } finally { sql("drop trigger fail_photo_test on public.audit_events; drop function private.fail_photo_test();"); }
  const staged = await prepare(id,bytes); expect((await storage("adminA",`object/product-photos/${staged.ticket.object_path}`,"POST",bytes)).status).toBe(200);
  succeed(await rpc("adminA","update_product",await editPayload(id,{ p_description: "Outra edição" }))); expect((await activate(id,staged)).data.message).toBe("STALE_VERSION");
  succeed(await rpc("adminA","retire_product_photo",{ ...member(),p_product_id: id,p_photo_id: staged.ticket.photo_id })); expect((await storage("seller",`object/authenticated/product-photos/${staged.ticket.object_path}`)).ok).toBe(false);
  const fake = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), forged = await prepare(id,fake);
  expect((await storage("adminA",`object/product-photos/${forged.ticket.object_path}`,"POST",fake)).status).toBe(200); succeed(await activate(id,forged)); expect((await page.request.get(`/api/products/${id}/photo`)).status()).toBe(404);
  // A deliberate Storage outage is recoverable; the active metadata is preserved.
  sql("create policy fail_product_upload on storage.objects as restrictive for insert to authenticated with check(false)");
  try { const latest = await detail(id); const r = await page.request.post(`/api/products/${id}/photo`,{ headers: { origin: "http://127.0.0.1:3100" },multipart: { operation: "upload",revision: String(latest.revision),key: randomUUID(),photo: { name: "foto.webp",mimeType: "image/webp",buffer: bytes } } }); expect(r.status()).toBe(503); expect((await detail(id)).photo_path).toBe(forged.ticket.object_path); }
  finally { sql("drop policy fail_product_upload on storage.objects"); }
  await page.goto(`/empresa/produtos/${id}`); await page.getByRole("button",{ name: "Limpar fotos não utilizadas",exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/empresa/produtos/${id}\\?foto=limpa$`));
});
