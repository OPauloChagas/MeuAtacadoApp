import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "../auth/setup";
import { actorToken } from "../admin/helpers";
import { fixtures, login, rpc, createPayload, adminDetail, updatePayload, succeed } from "./helpers";

test("admin cadastra, pesquisa, edita e rejeita documento equivalente sem perder campos", async ({ page }) => {
  const f = fixtures(), code = randomBytes(6).toString("hex"), name = `Cliente novo ${code}`, businessDocument = `PJ.${code}/A-01`;
  await login(page, "adminA");
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await page.getByRole("link", { name: "Novo cliente", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Novo cliente", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nome do cliente", { exact: false }).fill(name);
  await page.getByLabel("Nome do cliente", { exact: false }).press("Tab");
  await expect(page.getByLabel("Documento empresarial", { exact: false })).toBeFocused();
  await page.getByLabel("Documento empresarial", { exact: false }).fill(businessDocument);
  await page.getByLabel("E-mail de contato", { exact: true }).fill(`cliente-${code}@example.test`);
  await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await page.getByLabel("UF", { exact: true }).fill("sp");
  await page.getByLabel("Buscar vendedor pelo nome").fill("secundário");
  const sellerResponse = page.waitForResponse(response => response.url().includes("/api/customers/sellers?") && new URL(response.url()).searchParams.get("q") === "secundário");
  await page.getByRole("button", { name: "Buscar vendedores", exact: true }).click();
  const sellers = await sellerResponse;
  expect(sellers.status()).toBe(200); expect((await sellers.json()).data.items).toHaveLength(1);
  await expect(page.getByRole("option", { name: "Vendedor secundário A", exact: true })).toHaveCount(1);
  await page.getByLabel("Vendedor responsável").selectOption(f.seller2);
  await page.getByRole("button", { name: "Cadastrar cliente", exact: true }).click();
  await expect(page).toHaveURL(/\/empresa\/clientes\/[0-9a-f-]+\?salvo=1$/);
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  const created = await adminDetail(id);
  expect(created.document).toBe(businessDocument.replace(/[. /-]/g, "").toUpperCase()); expect(created.revision).toBe(1);
  expect(created.seller_membership_id).toBe(f.seller2); expect(created.address.state).toBe("SP");
  await page.getByLabel("Nome do cliente", { exact: false }).fill(`${name} revisado`);
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${name} revisado`);
  expect((await adminDetail(id)).revision).toBe(2);
  await page.goto("/empresa/clientes/novo");
  await page.getByLabel("Nome do cliente", { exact: false }).fill("Tentativa preservada");
  await page.getByLabel("Documento empresarial", { exact: false }).fill(businessDocument.toLowerCase());
  await page.getByRole("button", { name: "Cadastrar cliente", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Já existe um cliente");
  await expect(page.getByLabel("Nome do cliente", { exact: false })).toHaveValue("Tentativa preservada");
  await page.goto(`/empresa/clientes?q=${encodeURIComponent(code)}`);
  await expect(page.getByRole("heading", { name: "1 cliente encontrado", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: `${name} revisado`, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("seller vê somente carteira e edita apenas contato e endereço", async ({ page }) => {
  const f = fixtures(), before = await adminDetail(f.customerA);
  await login(page, "seller"); await page.getByRole("link", { name: "Minha carteira", exact: true }).click();
  await expect(page.getByRole("main")).not.toContainText(f.customerA2Name);
  await expect(page.getByRole("main")).not.toContainText(f.base.customerB);
  await expect(page.getByRole("link", { name: "Novo cliente", exact: true })).toHaveCount(0);
  const hidden = await page.request.get(`/api/customers?q=${encodeURIComponent(f.customerA2Name)}`);
  expect(hidden.status()).toBe(200); expect((await hidden.json()).data.total).toBe(0);
  expect((await page.request.get("/api/customers?status=all")).status()).toBe(403);
  expect((await page.request.get(`/api/customers/${f.customerA2}`)).status()).toBe(403);
  expect((await page.request.get(`/api/customers/${f.customerB}`)).status()).toBe(403);
  expect((await page.request.get("/api/customers/sellers")).status()).toBe(403);
  await page.getByRole("link", { name: f.base.customerA, exact: true }).click();
  await expect(page.getByLabel("Nome do cliente", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Documento empresarial", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Vendedor responsável")).toHaveCount(0);
  await expect(page.getByLabel("Situação do cliente")).toHaveCount(0);
  await page.getByLabel("Telefone", { exact: true }).fill("(11) 98888-0000");
  await page.getByLabel("Rua / logradouro", { exact: true }).fill("Rua da carteira");
  await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Cliente salvo com sucesso.");
  const after = await adminDetail(f.customerA);
  expect(after.name).toBe(before.name); expect(after.document).toBe(before.document); expect(after.seller_membership_id).toBe(f.base.memberSeller);
  expect(after.contact.phone).toBe("(11) 98888-0000"); expect(after.address.street).toBe("Rua da carteira");
  await page.goto("/empresa/clientes/novo"); await expect(page).toHaveURL(/\/acesso-negado$/);
  await page.goto(`/empresa/clientes/${f.customerA2}`); await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cliente indisponível");
});

test("buyer lê seu cadastro sem carteira e troca de contexto não preserva dados anteriores", async ({ page }) => {
  const f = fixtures();
  await login(page, "buyer"); await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await expect(page.getByRole("main")).toContainText(f.base.customerA);
  await expect(page.getByRole("button", { name: "Salvar alterações", exact: true })).toHaveCount(0);
  const own = await page.request.get(`/api/customers/${f.customerA}`); expect(own.status()).toBe(200);
  const data = (await own.json()).data;
  for (const key of ["sellerId", "sellerName", "sellerActive", "seller_membership_id", "revision", "tenant_id", "price_list_id", "cost"]) expect(data).not.toHaveProperty(key);
  expect(own.headers()["cache-control"]).toContain("no-store");
  sql(`update public.customers set contact=contact||'{"internal_note":"não público"}'::jsonb where id='${f.customerA}';`);
  try {
    const raw = await rpc("buyer", "get_customer", { p_membership_id: f.base.memberBuyer, p_customer_id: f.customerA });
    expect(raw.status).toBe(200); expect(raw.data.contact).not.toHaveProperty("internal_note");
    expect((await (await page.request.get(`/api/customers/${f.customerA}`)).json()).data.contact).not.toHaveProperty("internal_note");
  } finally { sql(`update public.customers set contact=contact-'internal_note' where id='${f.customerA}';`); }
  expect((await page.request.get(`/api/customers/${f.customerA2}`)).status()).toBe(403);
  expect((await page.request.get(`/api/customers/${f.customerB}`)).status()).toBe(403);
  expect((await page.request.get("/api/customers")).status()).toBe(403);
  await page.getByRole("button", { name: "Sair", exact: true }).click(); await expect(page).toHaveURL(/\/login$/);
  await login(page, "multi", "A"); await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await expect(page.getByRole("main")).toContainText(f.base.customerA);
  await page.getByRole("link", { name: "Trocar acesso", exact: true }).click();
  await page.getByRole("radio", { name: new RegExp(f.base.companyB) }).check(); await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page).toHaveURL(/\/cliente\/inicio$/); await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await expect(page.getByRole("main")).toContainText(f.base.customerB); await expect(page.getByRole("main")).not.toContainText(f.base.customerA);
  expect((await page.request.get(`/api/customers/${f.customerA}`)).status()).toBe(403);
  await page.getByRole("button", { name: "Sair", exact: true }).click(); await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(`/api/customers/${f.customerB}`)).status()).toBe(401);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("reatribuição e bloqueio revogam leitura e replay com o mesmo JWT", async ({ page }) => {
  const f = fixtures(), before = await adminDetail(f.customerA);
  const contact = { p_membership_id: f.base.memberSeller, p_customer_id: f.customerA, p_expected_revision: before.revision,
    p_contact: { email: "carteira@example.test" }, p_address: {}, p_idempotency_key: randomUUID() };
  const results = await Promise.all([rpc("seller", "update_customer_contacts", contact), rpc("seller", "update_customer_contacts", contact)]);
  expect(results.map(result => result.status)).toEqual([200, 200]); expect(results[0]!.data).toEqual(results[1]!.data);
  expect(sql(`select count(*) from public.audit_events where request_id='${contact.p_idempotency_key}';`)).toBe("1");
  await login(page, "buyer"); await page.goto("/cliente/minha-conta");
  try {
    succeed(await rpc("adminA", "update_customer", await updatePayload(f.customerA, { p_seller_membership_id: f.seller2 })));
    expect((await rpc("seller", "get_customer", { p_membership_id: f.base.memberSeller, p_customer_id: f.customerA })).data.message).toBe("ACCESS_DENIED");
    expect((await rpc("seller", "update_customer_contacts", contact)).data.message).toBe("ACCESS_DENIED");
    expect((await rpc("orphan", "get_customer", { p_membership_id: f.seller2, p_customer_id: f.customerA })).status).toBe(200);
    succeed(await rpc("adminA", "update_customer", await updatePayload(f.customerA, { p_status: "inactive" })));
    expect((await page.request.get(`/api/customers/${f.customerA}`)).status()).toBe(403);
    expect((await rpc("buyer", "get_customer", { p_membership_id: f.base.memberBuyer, p_customer_id: f.customerA })).data.message).toBe("ACCESS_DENIED");
    expect((await rpc("orphan", "get_customer", { p_membership_id: f.seller2, p_customer_id: f.customerA })).data.message).toBe("ACCESS_DENIED");
    const blocked = await page.request.get(`http://127.0.0.1:54321/rest/v1/customers?id=eq.${f.customerA}&select=id`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${await actorToken("orphan")}` },
    });
    expect(blocked.status()).toBe(200); expect(await blocked.json()).toEqual([]);
    expect((await adminDetail(f.customerA)).status).toBe("inactive");
    await page.goto("/cliente/minha-conta"); await expect(page).toHaveURL(/\/sem-acesso$/);
  } finally { succeed(await rpc("adminA", "update_customer", await updatePayload(f.customerA, { p_status: "active", p_seller_membership_id: f.base.memberSeller }))); }
  expect((await rpc("seller", "get_customer", { p_membership_id: f.base.memberSeller, p_customer_id: f.customerA })).status).toBe(200);
});

test("RPCs preservam tenant, revisões, repetição, auditoria e grants mínimos", async ({ request }) => {
  const f = fixtures(), code = randomBytes(7).toString("hex"), payload = createPayload(`ID-${code}`, `Concorrente ${code}`);
  const repeated = await Promise.all([rpc("adminA", "create_customer", payload), rpc("adminA", "create_customer", payload)]);
  expect(repeated.map(result => result.status)).toEqual([200, 200]); expect(repeated[0]!.data).toEqual(repeated[1]!.data);
  const id = repeated[0]!.data.customer_id;
  expect(sql(`select count(*) from public.audit_events where request_id='${payload.p_idempotency_key}';`)).toBe("1");
  expect((await rpc("adminA", "create_customer", { ...payload, p_name: "Outro" })).data.message).toBe("IDEMPOTENCY_CONFLICT");
  const doc = `EQUIV-${code}`;
  const duplicate = await Promise.all([rpc("adminA", "create_customer", createPayload(doc, `Documento ${code}`)), rpc("adminA", "create_customer", createPayload(doc.toLowerCase().replace("-", ". /"), `Equivalente ${code}`))]);
  expect(duplicate.filter(result => result.status === 200)).toHaveLength(1);
  expect(duplicate.find(result => result.status !== 200)!.data.message).toBe("DOCUMENT_IN_USE");
  expect((await rpc("adminB", "create_customer", { ...createPayload(doc, `Outro tenant ${code}`), p_membership_id: f.base.memberAdminB })).status).toBe(200);
  for (const seller of [f.sellerB, f.base.memberBuyer]) expect((await rpc("adminA", "create_customer", createPayload(`BAD-${randomBytes(4).toString("hex")}`, "Inválido", seller))).data.message).toBe("SELLER_UNAVAILABLE");
  sql(`update public.memberships set status='inactive' where id='${f.seller2}';`);
  try { expect((await rpc("adminA", "create_customer", createPayload(`BAD-${code}`, "Inativo", f.seller2))).data.message).toBe("SELLER_UNAVAILABLE"); }
  finally { sql(`update public.memberships set status='active' where id='${f.seller2}';`); }
  const first = await updatePayload(id, { p_name: "Versão escolhida 1" }), second = { ...first, p_name: "Versão escolhida 2", p_idempotency_key: randomUUID() };
  const concurrent = await Promise.all([rpc("adminA", "update_customer", first), rpc("adminA", "update_customer", second)]);
  expect(concurrent.filter(result => result.status === 200)).toHaveLength(1);
  expect(concurrent.find(result => result.status !== 200)!.data.message).toBe("STALE_VERSION");
  const winner = concurrent[0]!.status === 200 ? first : second;
  expect((await rpc("adminA", "update_customer", winner)).data).toEqual(concurrent.find(result => result.status === 200)!.data);
  const revision = (await adminDetail(id)).revision, key = randomUUID();
  sql(`create function private.test_customer_audit() returns trigger language plpgsql as $$begin raise exception 'TEST_AUDIT_FAILURE'; end$$;
    create trigger test_customer_audit before insert on public.audit_events for each row when(new.entity_type='customer' and new.tenant_id='${f.base.tenantA}'::uuid) execute function private.test_customer_audit();`);
  try {
    const auditDoc = `AUDIT-${code}`;
    expect((await rpc("adminA", "create_customer", { ...createPayload(auditDoc, "Deve reverter"), p_idempotency_key: key })).data.message).toBe("TEST_AUDIT_FAILURE");
    expect(sql(`select count(*) from public.customers where tenant_id='${f.base.tenantA}' and document_key='${auditDoc.replace("-", "").toUpperCase()}';`)).toBe("0");
    expect(sql(`select count(*) from public.idempotency_keys where key='${key}';`)).toBe("0");
    expect((await rpc("adminA", "update_customer", await updatePayload(id, { p_name: "Também reverte" }))).data.message).toBe("TEST_AUDIT_FAILURE");
    expect((await adminDetail(id)).revision).toBe(revision);
  } finally { sql("drop trigger test_customer_audit on public.audit_events; drop function private.test_customer_audit();"); }
  for (const [actor, mid] of [["seller", f.base.memberSeller], ["buyer", f.base.memberBuyer]] as const) {
    expect((await rpc(actor, "create_customer", { ...payload, p_membership_id: mid })).data.message).toBe("ACCESS_DENIED");
    expect((await rpc(actor, "update_customer", { ...await updatePayload(id), p_membership_id: mid })).data.message).toBe("ACCESS_DENIED");
  }
  expect((await rpc("adminA", "get_customer", { p_membership_id: f.base.memberAdminA, p_customer_id: f.customerB })).data.message).toBe("ACCESS_DENIED");
  for (const actor of ["adminA", "seller", "buyer"] as const) {
    const token = await actorToken(actor), headers = { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${token}` };
    for (const select of ["*", "contact,address", "seller_membership_id"]) expect((await request.get(`http://127.0.0.1:54321/rest/v1/customers?select=${select}`, { headers })).status()).toBe(403);
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const response = await request.fetch(`http://127.0.0.1:54321/rest/v1/customers${method === "POST" ? "" : `?id=eq.${id}`}`, { method, headers, ...(method === "DELETE" ? {} : { data: { name: "Ataque" } }) });
      expect(response.status()).toBe(403); expect((await response.json()).code).toBe("42501");
    }
  }
  const anon = await request.post("http://127.0.0.1:54321/rest/v1/rpc/get_customer", { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, data: { p_membership_id: f.base.memberAdminA, p_customer_id: id } });
  expect([401, 403]).toContain(anon.status());
});

test("contexto selecionado, busca literal e paginação não herdam outra função nem outro tenant", async ({ page }) => {
  const f = fixtures();
  const own = await rpc("recovery360", "list_customers", { p_membership_id: f.dualSeller });
  expect(own.status).toBe(200); expect(own.data.items.map((item: { id: string }) => item.id)).toEqual([f.customerDual]);
  expect((await rpc("recovery360", "create_customer", { ...createPayload(`DUAL-${randomBytes(5).toString("hex")}`, "Proibido"), p_membership_id: f.dualSeller })).data.message).toBe("ACCESS_DENIED");
  expect((await rpc("recovery360", "update_customer_contacts", { p_membership_id: f.dualSeller, p_customer_id: f.customerA, p_expected_revision: 1, p_contact: {}, p_address: {}, p_idempotency_key: randomUUID() })).data.message).toBe("ACCESS_DENIED");
  await login(page, "recovery360", "seller"); await page.getByRole("link", { name: "Minha carteira", exact: true }).click();
  await expect(page.getByRole("link", { name: f.dualName, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: f.base.customerA, exact: true })).toHaveCount(0);
  expect((await page.request.get(`/api/customers/${f.customerA}`)).status()).toBe(403);
  const prefix = `Paginado${randomBytes(5).toString("hex")}`;
  sql(`insert into public.customers(tenant_id,document,name,seller_membership_id) select '${f.base.tenantA}','${prefix}'||n,'${prefix} '||n,'${f.base.memberSeller}' from generate_series(1,25) n;
    insert into public.customers(tenant_id,document,name) values('${f.base.tenantB}','${prefix}B','${prefix} fora');`);
  const first = await rpc("seller", "list_customers", { p_membership_id: f.base.memberSeller, p_search: prefix });
  const second = await rpc("seller", "list_customers", { p_membership_id: f.base.memberSeller, p_search: prefix, p_page: 1 });
  expect(first.data.total).toBe(25); expect(first.data.items).toHaveLength(20); expect(second.data.total).toBe(25); expect(second.data.items).toHaveLength(5);
  const ids = [...first.data.items, ...second.data.items].map((item: { id: string }) => item.id); expect(new Set(ids).size).toBe(25);
  expect((await rpc("orphan", "list_customers", { p_membership_id: f.seller2, p_search: prefix })).data.total).toBe(0);
  expect((await rpc("seller", "list_customers", { p_membership_id: f.base.memberSeller, p_search: "%_" })).data.total).toBe(0);
  expect((await rpc("adminA", "list_customers", { p_membership_id: f.base.memberAdminA, p_page_size: 101 })).data.message).toBe("VALIDATION_ERROR");
  const sellerOptions = await rpc("adminA", "list_customer_sellers", { p_membership_id: f.base.memberAdminA, p_page_size: 1 });
  expect(sellerOptions.data.items).toHaveLength(1); expect(sellerOptions.data.total).toBe(3);
  expect((await rpc("buyer", "list_customers", { p_membership_id: f.base.memberBuyer })).data.message).toBe("ACCESS_DENIED");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
