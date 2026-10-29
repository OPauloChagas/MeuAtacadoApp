/** Real local Auth/PostgREST checks. Never loads .env.local or uses remote DBs. */
import assert from "node:assert/strict";
import { execFileSync, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";

const execute = promisify(execFile);
const container = "supabase_db_meuatacado-local";
const cli = new URL("../node_modules/.bin/supabase", import.meta.url).pathname;
const root = new URL("../", import.meta.url);
const sqlArgs = ["exec", "-i", container, "psql", "--no-psqlrc", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"];
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (statement) => execFileSync("docker", sqlArgs, { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const sqlJson = (statement) => {
  const value = sql(statement);
  return value === "t" ? true : value === "f" ? false : JSON.parse(value);
};
let base;
let publicKey;
let setupKey;
let passed = 0;
let currentCheck = "inicialização local";

async function check(name, run) {
  currentCheck = name;
  await run();
  passed += 1;
  console.log(`OK ${passed}: ${name}`);
}

async function request(path, { token, method = "GET", body, setup = false } = {}) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, "O runner não aceita outro servidor.");
  assert.ok(!setup || path.startsWith("/auth/v1/admin/users"), "Chave elevada só pode criar usuários de fixture no Auth local.");
  const headers = { apikey: setup ? setupKey : publicKey, "Content-Type": "application/json" };
  if (setup || token) headers.Authorization = `Bearer ${setup ? setupKey : token}`;
  const response = await fetch(url, {
    method, headers, signal: AbortSignal.timeout(20_000),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, data };
}
const rpc = (user, name, body = {}) => request(`/rest/v1/rpc/${name}`, { token: user.token, method: "POST", body });
const rows = async (user, resource) => {
  const response = await request(`/rest/v1/${resource}`, { token: user.token });
  assert.equal(response.status, 200, `Leitura ${resource}: HTTP ${response.status}`);
  return response.data;
};
const success = (response) => {
  assert.equal(response.status, 200, `RPC: HTTP ${response.status}, código ${response.data?.message ?? "sem resposta"}`);
  return response.data;
};
function denied(response, message = "ACCESS_DENIED") {
  assert.ok(response.status >= 400 && response.status < 500, `Negação esperada, HTTP ${response.status}`);
  assert.equal(response.data.message, message);
}

async function main() {
  const status = execFileSync(cli, ["status", "--output", "json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const config = JSON.parse(status);
  base = new URL(config.API_URL);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Testes de identidade recusam Supabase remoto.");
  assert.equal(base.port, "54321", "Porta local diferente da configuração versionada.");
  publicKey = config.PUBLISHABLE_KEY ?? config.ANON_KEY;
  setupKey = config.SERVICE_ROLE_KEY ?? config.SECRET_KEY;
  assert.ok(publicKey && setupKey, "Stack local precisa fornecer suas chaves de teste.");
  const statusClaim = sqlJson("select json_build_object('database',current_database(),'schema',to_regclass('public.memberships') is not null);");
  assert.equal(statusClaim.database, "postgres");
  assert.equal(statusClaim.schema, true, "Execute db:reset local após adicionar as migrations.");

  const runId = randomBytes(6).toString("hex");
  const password = randomBytes(24).toString("base64url");
  await check("cadastro público bloqueado com provedor de login por e-mail habilitado", async () => {
    const response = await request("/auth/v1/signup", {
      method: "POST", body: { email: `${runId}-signup@example.test`, password },
    });
    assert.equal(response.status, 422);
    assert.equal(response.data.error_code, "signup_disabled");
  });
  const users = {};
  for (const name of ["adminA", "adminA2", "sellerA", "buyerA1", "buyerA2", "adminB", "sellerB", "buyerB", "multi", "disabled", "orphan"]) {
    const email = `${runId}-${name.toLowerCase()}@example.test`;
    const created = await request("/auth/v1/admin/users", {
      setup: true, method: "POST", body: { email, password, email_confirm: true, user_metadata: { role: "admin", tenant_id: "spoofed-tenant" } },
    });
    assert.ok(created.status === 200 || created.status === 201, `Falha ao criar ator fictício ${name}.`);
    const id = created.data.id ?? created.data.user?.id;
    assert.ok(typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id), "Auth não retornou UUID.");
    const signedIn = await request("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
    assert.equal(signedIn.status, 200, `Login real do ator ${name} falhou (${signedIn.data?.error_code ?? "sem código"}).`);
    assert.ok(typeof signedIn.data.access_token === "string", "Auth não emitiu JWT.");
    users[name] = { id, token: signedIn.data.access_token };
  }

  const provisionKey = randomUUID();
  const provisionStatement = (key = provisionKey, document = `TEST-A-${runId}`) =>
    `select private.provision_tenant(${literal(key)}::uuid,${literal(users.adminA.id)}::uuid,${literal(document)},'Fornecedor fictício A','Fornecedor A');`;
  const tenantA = sqlJson(provisionStatement());
  const tenantB = sqlJson(`select private.provision_tenant(${literal(randomUUID())}::uuid,${literal(users.adminB.id)}::uuid,${literal(`TEST-B-${runId}`)},'Fornecedor fictício B','Fornecedor B');`);
  const ids = {
    tenantA: tenantA.tenant_id, tenantB: tenantB.tenant_id,
    memberAdminA: tenantA.membership_id, memberAdminB: tenantB.membership_id,
    customerA1: randomUUID(), customerA2: randomUUID(), customerB: randomUUID(),
  };
  for (const name of ["AdminA2", "SellerA", "BuyerA1", "BuyerA2", "SellerB", "BuyerB", "MultiA", "MultiB", "Disabled"]) ids[`member${name}`] = randomUUID();
  const variables = { ...ids, runId, ...Object.fromEntries(Object.entries(users).map(([name, user]) => [name, user.id])) };
  const fixtureArgs = Object.entries(variables).flatMap(([name, value]) => ["-v", `${name}=${value}`]);
  const seedFixtures = () => execFileSync("docker", [...sqlArgs, ...fixtureArgs], {
    input: readFileSync(new URL("../supabase/fixtures/identity.sql", import.meta.url), "utf8"),
    encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
  seedFixtures();
  await check("fixtures repetidos não duplicam vínculos", async () => {
    seedFixtures();
    assert.equal(sqlJson(`select count(*) from public.memberships where tenant_id in (${literal(ids.tenantA)},${literal(ids.tenantB)});`), 11);
  });

  const statusPayload = (acting, target, state = "inactive", key = randomUUID()) => ({
    p_membership_id: ids[acting], p_target_membership_id: ids[target], p_status: state, p_idempotency_key: key,
  });
  const updatePayload = (revision = 1, name = "Fornecedor revisado", key = randomUUID(), acting = "memberAdminA") => ({
    p_membership_id: ids[acting], p_expected_revision: revision, p_legal_name: "Fornecedor fictício A",
    p_trade_name: name, p_contact: { email: "contato@example.test" }, p_address: {}, p_idempotency_key: key,
  });
  const contexts = async (user) => success(await rpc(user, "get_my_contexts"));
  const auditCount = (requestId) => sqlJson(`select count(*) from public.audit_events where request_id=${literal(requestId)}::uuid;`);
  const expectSqlViolation = (statement, code) => {
    let rejected = false;
    try { sql(`begin; ${statement}; rollback;`); } catch (error) {
      rejected = true;
      assert.ok(String(error.stderr).includes(code), `Constraint deveria emitir ${code}.`);
    }
    assert.ok(rejected, "Escrita inválida não foi recusada pelo banco.");
  };

  await check("Auth emite JWTs reais; dois tenants e cliente multivínculo", async () => {
    assert.equal((await contexts(users.adminA)).length, 1);
    const multi = await contexts(users.multi);
    assert.deepEqual(multi.map((c) => c.tenant_id).sort(), [ids.tenantA, ids.tenantB].sort());
    assert.deepEqual(multi.map((c) => c.customer_id).sort(), [ids.customerA2, ids.customerB].sort());
    assert.ok(multi.every((c) => !Object.hasOwn(c, "document") && !Object.hasOwn(c, "contact")));
    assert.equal((await contexts(users.orphan)).length, 0);
  });
  await check("leitura direta: admins A/B isolados por RLS", async () => {
    assert.deepEqual((await rows(users.adminA, "customers?select=id")).map((c) => c.id).sort(), [ids.customerA1, ids.customerA2].sort());
    assert.deepEqual((await rows(users.adminB, "customers?select=id")).map((c) => c.id), [ids.customerB]);
    assert.deepEqual(await rows(users.adminA, `customers?id=eq.${ids.customerB}&select=id`), []);
  });
  await check("leitura direta: vendedor restrito à carteira", async () => {
    assert.deepEqual((await rows(users.sellerA, "customers?select=id")).map((c) => c.id), [ids.customerA1]);
    assert.deepEqual((await rows(users.sellerB, "customers?select=id")).map((c) => c.id), [ids.customerB]);
  });
  await check("leitura direta: compradores não acessam outro cliente/tenant", async () => {
    for (const [name, customerId] of [["buyerA1", ids.customerA1], ["buyerA2", ids.customerA2], ["buyerB", ids.customerB]]) {
      assert.deepEqual((await rows(users[name], "customers?select=id")).map((c) => c.id), [customerId]);
    }
    assert.deepEqual(await rows(users.buyerA1, `customers?id=eq.${ids.customerA2}&select=id`), []);
  });
  await check("contexto é seleção validada; UUID de outro ator não autoriza", async () => {
    for (const user of [users.adminA, users.sellerA, users.buyerA1]) {
      denied(await rpc(user, "get_current_context", { p_membership_id: ids.memberAdminB }));
    }
    assert.equal(success(await rpc(users.buyerA1, "get_current_context", { p_membership_id: ids.memberBuyerA1 })).role, "buyer");
    denied(await rpc(users.multi, "get_current_context", { p_membership_id: ids.memberBuyerA1 }));
    assert.equal(success(await rpc(users.multi, "get_current_context", { p_membership_id: ids.memberMultiB })).tenant_id, ids.tenantB);
  });
  await check("perfil próprio e memberships não expõem outras identidades", async () => {
    assert.deepEqual((await rows(users.buyerA1, "profiles?select=user_id")).map((p) => p.user_id), [users.buyerA1.id]);
    assert.deepEqual((await rows(users.buyerA1, "memberships?select=id")).map((m) => m.id), [ids.memberBuyerA1]);
    assert.ok((await rows(users.adminA, "memberships?select=tenant_id")).every((m) => m.tenant_id === ids.tenantA));
  });
  await check("anon não lê tabelas nem executa RPC; helpers/provisionamento fora da API", async () => {
    for (const resource of ["profiles", "memberships", "customers"]) {
      const response = await request(`/rest/v1/${resource}?select=*`);
      assert.ok(response.status === 401 || response.status === 403);
    }
    assert.ok([401, 403].includes((await request("/rest/v1/rpc/get_my_contexts", { method: "POST", body: {} })).status));
    for (const name of ["active_admin", "require_admin", "provision_tenant"]) {
      assert.equal((await rpc(users.adminA, name)).status, 404);
    }
  });
  await check("DML direto negado mesmo com JWT admin, seller e buyer legítimos", async () => {
    const payloads = {
      profiles: { display_name: "Ataque" }, tenants: { trade_name: "Ataque" }, customers: { name: "Ataque" },
      memberships: { role: "admin" }, invitations: { state: "accepted" }, audit_events: { action: "forged" }, idempotency_keys: { operation: "forged" }, products: { name: "Ataque" }, product_photos: { state: "active" }, price_lists: { name: "Ataque" }, price_list_versions: { state: "published" }, price_list_items: { unit_price: "1.00" }, commission_tables: { name: "Ataque" }, commission_versions: { state: "published" }, commission_items: { rate: "0" }, payment_terms: { name: "Ataque" }, seller_commission_assignments: { revision: 999 },
    };
    for (const user of [users.adminA, users.sellerA, users.buyerA1]) {
      for (const [resource, body] of Object.entries(payloads)) {
        for (const method of ["POST", "PATCH", "DELETE"]) {
          const filter = method === "POST" ? "" : resource === "profiles"
            ? `?user_id=eq.${users.adminA.id}` : `?id=eq.${resource === "tenants" ? ids.tenantA : resource === "memberships" ? ids.memberAdminA : ids.customerA1}`;
          const response = await request(`/rest/v1/${resource}${filter}`, { token: user.token, method, ...(method === "DELETE" ? {} : { body }) });
          assert.ok([401, 403].includes(response.status), `${resource} ${method} deveria negar privilégios, HTTP ${response.status}.`);
          assert.equal(response.data.code, "42501");
        }
      }
    }
  });
  await check("DTO administrativo e tabelas internas não vazam ao comprador", async () => {
    assert.equal(success(await rpc(users.adminA, "get_tenant_admin", { p_membership_id: ids.memberAdminA })).id, ids.tenantA);
    for (const user of [users.buyerA1, users.sellerA, users.adminB]) {
      denied(await rpc(user, "get_tenant_admin", { p_membership_id: ids.memberAdminA }));
    }
    for (const resource of ["tenants", "invitations", "audit_events", "idempotency_keys"]) {
      assert.ok([401, 403].includes((await request(`/rest/v1/${resource}?select=*`, { token: users.buyerA1.token })).status));
    }
  });
  await check("metadata admin forjada não permite operação administrativa", async () => {
    for (const [name, acting] of [["sellerA", "memberSellerA"], ["buyerA1", "memberBuyerA1"]]) {
      denied(await rpc(users[name], "set_membership_status", statusPayload(acting, "memberAdminA")));
      denied(await rpc(users[name], "update_tenant", updatePayload(1, "Ataque", randomUUID(), acting)));
    }
    denied(await rpc(users.buyerA1, "update_tenant", updatePayload()));
    denied(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberAdminB")));
  });
  await check("papéis dedicados não são donos das tabelas nem bypass de RLS", async () => {
    const roles = sqlJson("select json_agg(json_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,'bypass',rolbypassrls,'inherit',rolinherit)) from pg_roles where rolname in ('atacado_executor','atacado_membership_reader');");
    assert.equal(roles.length, 2);
    assert.ok(roles.every((r) => !r.login && !r.super && !r.bypass && !r.inherit));
    const tables = sqlJson("select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'owner',r.rolname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner where n.nspname='public' and c.relname in ('tenants','profiles','customers','memberships','invitations','audit_events','idempotency_keys','products','product_photos','price_lists','price_list_versions','price_list_items','commission_tables','commission_versions','commission_items','payment_terms','seller_commission_assignments');");
    assert.equal(tables.length, 17);
    assert.ok(tables.every((t) => t.rls && t.forced && !roles.some((r) => r.name === t.owner)));
    const procedures = sqlJson("select json_agg(json_build_object('owner',r.rolname,'definer',p.prosecdef,'config',p.proconfig,'anon',has_function_privilege('anon',p.oid,'EXECUTE'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='public' and p.proname in ('get_my_contexts','get_current_context','get_tenant_admin','update_tenant','set_membership_status','get_tenant_access','request_invitation','claim_invitation_delivery','finish_invitation_delivery','cancel_invitation','get_my_invitation','accept_invitation','list_customers','get_customer','list_customer_sellers','create_customer','update_customer','update_customer_contacts','list_products','get_product','create_product','update_product','prepare_product_photo','set_product_photo','retire_product_photo','finish_product_photo_cleanup','list_commercial_tables','save_commercial_table','list_commercial_versions','save_commercial_version','get_commercial_version','set_commercial_item','publish_commercial_version','list_payment_terms','save_payment_term','get_customer_commercial','set_customer_commercial','list_seller_commission_assignments','assign_seller_commission','end_seller_commission_assignment','list_catalog','get_catalog_photo','quote_catalog');");
    assert.equal(procedures.length, 43);
    assert.ok(procedures.every((p) => p.owner === "atacado_executor" && p.definer && !p.anon && p.config.includes('search_path=""') && p.config.includes("row_security=on")));
    assert.equal(sqlJson("select has_function_privilege('authenticated','private.provision_tenant(uuid,uuid,text,text,text,text)','EXECUTE');"), false);
    assert.equal(sqlJson("select pg_has_role('authenticated','atacado_executor','MEMBER');"), false);
    assert.equal(sqlJson("select has_schema_privilege('authenticated','private','USAGE');"), false);
  });
  await check("FK composta e constraints impedem referências/roles inconsistentes", async () => {
    expectSqlViolation(`insert into public.memberships(tenant_id,user_id,role,customer_id) values (${literal(ids.tenantA)},${literal(users.orphan.id)},'buyer',${literal(ids.customerB)})`, "23503");
    expectSqlViolation(`update public.customers set seller_membership_id=${literal(ids.memberAdminA)} where id=${literal(ids.customerA1)}`, "23514");
    expectSqlViolation(`update public.memberships set role='admin' where id=${literal(ids.memberSellerA)}`, "23514");
    expectSqlViolation(`update public.customers set tenant_id=${literal(ids.tenantB)} where id=${literal(ids.customerA1)}`, "23514");
    expectSqlViolation(`insert into public.memberships(tenant_id,user_id,role) values (${literal(ids.tenantA)},${literal(users.orphan.id)},'buyer')`, "23514");
    expectSqlViolation(`insert into public.memberships(tenant_id,user_id,role) values (${literal(ids.tenantA)},${literal(users.adminA.id)},'admin')`, "23505");
  });
  await check("provisionamento privado idempotente também sob concorrência", async () => {
    assert.deepEqual(sqlJson(provisionStatement()), tenantA);
    const freshKey = randomUUID();
    const freshDocument = `TEST-C-${runId}`;
    const freshStatement = `select private.provision_tenant(${literal(freshKey)}::uuid,${literal(users.orphan.id)}::uuid,${literal(freshDocument)},'Fornecedor fictício C','Fornecedor C');`;
    const run = async () => {
      const r = await execute("docker", [...sqlArgs, "-c", freshStatement]);
      return JSON.parse(r.stdout.trim());
    };
    const created = await Promise.all([run(), run()]);
    assert.deepEqual(created[0], created[1]);
    assert.equal(sqlJson(`select count(*) from public.tenants where document=${literal(freshDocument)};`), 1);
    assert.equal(auditCount(freshKey), 1);
    expectSqlViolation(provisionStatement(provisionKey, `OTHER-${runId}`).replace(/^select /, "select ").replace(/;$/, ""), "P0001");
  });
  await check("vínculo, perfil, tenant e cliente inativos negam a próxima leitura", async () => {
    assert.deepEqual(await contexts(users.disabled), []);
    assert.deepEqual(await rows(users.disabled, "customers?select=id"), []);
    sql(`update public.tenants set status='inactive' where id=${literal(ids.tenantB)};`);
    try {
      assert.deepEqual(await contexts(users.adminB), []);
      assert.deepEqual(await rows(users.buyerB, "customers?select=id"), []);
    } finally { sql(`update public.tenants set status='active' where id=${literal(ids.tenantB)};`); }
    sql(`update public.customers set status='inactive' where id=${literal(ids.customerA1)};`);
    try { assert.deepEqual(await contexts(users.buyerA1), []); }
    finally { sql(`update public.customers set status='active' where id=${literal(ids.customerA1)};`); }
  });
  await check("revogação imediata e repetição idempotente sem duplicar auditoria", async () => {
    const key = randomUUID();
    const payload = statusPayload("memberAdminA", "memberSellerA", "inactive", key);
    const responses = await Promise.all([rpc(users.adminA, "set_membership_status", payload), rpc(users.adminA, "set_membership_status", payload)]);
    assert.deepEqual(success(responses[0]), success(responses[1]));
    assert.equal(auditCount(key), 1);
    assert.deepEqual(await contexts(users.sellerA), []);
    assert.deepEqual(await rows(users.sellerA, "customers?select=id"), []);
    denied(await rpc(users.sellerA, "get_current_context", { p_membership_id: ids.memberSellerA }));
    denied(await rpc(users.adminA, "set_membership_status", { ...payload, p_status: "active" }), "IDEMPOTENCY_CONFLICT");
    success(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberSellerA", "active")));
    assert.equal((await contexts(users.sellerA)).length, 1);
  });
  await check("resposta idempotente não pode ser relida por admin revogado", async () => {
    const payload = statusPayload("memberAdminA2", "memberSellerA", "active");
    success(await rpc(users.adminA2, "set_membership_status", payload));
    success(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberAdminA2", "inactive")));
    denied(await rpc(users.adminA2, "set_membership_status", payload));
    success(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberAdminA2", "active")));
  });
  await check("versão esperada serializa atualizações concorrentes da empresa", async () => {
    const first = updatePayload(1, "Nome escolhido 1");
    const second = updatePayload(1, "Nome escolhido 2", randomUUID(), "memberAdminA2");
    const results = await Promise.all([rpc(users.adminA, "update_tenant", first), rpc(users.adminA2, "update_tenant", second)]);
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    denied(results.find((r) => r.status !== 200), "STALE_VERSION");
    const winner = results[0].status === 200 ? 0 : 1;
    assert.deepEqual(success(await rpc(winner === 0 ? users.adminA : users.adminA2, "update_tenant", winner === 0 ? first : second)), results[winner].data);
    const tenant = success(await rpc(users.adminA, "get_tenant_admin", { p_membership_id: ids.memberAdminA }));
    assert.equal(tenant.revision, 2);
    denied(await rpc(users.adminA, "update_tenant", { ...updatePayload(2), p_contact: [] }), "VALIDATION_ERROR");
    denied(await rpc(users.adminA, "update_tenant", { ...updatePayload(2), p_trade_name: " " }), "VALIDATION_ERROR");
  });
  await check("falha da auditoria aborta mutation e chave de repetição", async () => {
    const key = randomUUID();
    sql(`create function private.test_reject_audit() returns trigger language plpgsql as $$begin raise exception 'TEST_AUDIT_FAILURE'; end$$;
      create trigger test_reject_audit before insert on public.audit_events for each row when (new.tenant_id=${literal(ids.tenantA)}::uuid) execute function private.test_reject_audit();`);
    try {
      const response = await rpc(users.adminA, "update_tenant", updatePayload(2, "Deve reverter", key));
      assert.ok(response.status >= 400);
      assert.equal(response.data.message, "TEST_AUDIT_FAILURE");
      assert.equal(success(await rpc(users.adminA, "get_tenant_admin", { p_membership_id: ids.memberAdminA })).revision, 2);
      assert.equal(auditCount(key), 0);
      assert.equal(sqlJson(`select count(*) from public.idempotency_keys where key=${literal(key)}::uuid;`), 0);
    } finally { sql("drop trigger test_reject_audit on public.audit_events; drop function private.test_reject_audit();"); }
  });
  await check("admin com perfil global inativo não conta como sobrevivente", async () => {
    sql(`update public.profiles set status='inactive' where user_id=${literal(users.adminA2.id)};`);
    try { denied(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberAdminA")), "LAST_ADMIN"); }
    finally { sql(`update public.profiles set status='active' where user_id=${literal(users.adminA2.id)};`); }
  });
  await check("autodesativação permitida com outro admin, auditada e sem replay após revogar", async () => {
    const payload = statusPayload("memberAdminA2", "memberAdminA2");
    success(await rpc(users.adminA2, "set_membership_status", payload));
    assert.equal(auditCount(payload.p_idempotency_key), 1);
    denied(await rpc(users.adminA2, "set_membership_status", payload));
    success(await rpc(users.adminA, "set_membership_status", statusPayload("memberAdminA", "memberAdminA2", "active")));
  });
  await check("duas desativações concorrentes sempre deixam um admin ativo", async () => {
    const first = statusPayload("memberAdminA", "memberAdminA2");
    const second = statusPayload("memberAdminA2", "memberAdminA");
    const responses = await Promise.all([rpc(users.adminA, "set_membership_status", first), rpc(users.adminA2, "set_membership_status", second)]);
    assert.equal(responses.filter((r) => r.status === 200).length, 1);
    denied(responses.find((r) => r.status !== 200));
    assert.equal(sqlJson(`select count(*) from public.memberships where tenant_id=${literal(ids.tenantA)}::uuid and role='admin' and status='active';`), 1);
    const winner = responses[0].status === 200 ? users.adminA : users.adminA2;
    const winnerId = responses[0].status === 200 ? "memberAdminA" : "memberAdminA2";
    denied(await rpc(winner, "set_membership_status", statusPayload(winnerId, winnerId)), "LAST_ADMIN");
  });
  console.log(`\n${passed} verificações de identidade aprovadas com Auth/JWTs e banco locais reais. Nenhum endpoint remoto utilizado.`);
}

main().catch((error) => {
  console.error(`Falha em: ${currentCheck}`);
  // Never print HTTP request objects, headers, passwords, JWTs or CLI status.
  console.error(error instanceof Error ? error.message : "Erro não identificado.");
  process.exitCode = 1;
});
