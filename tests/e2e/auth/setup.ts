import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

export function sql(statement: string): string {
  return execFileSync("docker", ["exec", "-i", "supabase_db_meuatacado-local", "psql", "--no-psqlrc", "-U", "postgres", "-d", "postgres", "-qAt", "-v", "ON_ERROR_STOP=1"], {
    input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export type Fixtures = {
  password: string;
  actors: Record<"adminA" | "adminB" | "seller" | "buyer" | "multi" | "orphan" | "recovery360" | "recovery1440", { email: string; id: string }>;
  tenantA: string; tenantB: string; memberAdminA: string; memberAdminB: string;
  memberSeller: string; memberBuyer: string; memberMultiA: string; memberMultiB: string;
  companyA: string; companyB: string; customerA: string; customerB: string;
};

export default async function setup() {
  if (process.env.AUTH_E2E_LOCAL !== "1") throw new Error("Somente Docker local.");
  const config = JSON.parse(execFileSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  if (config.API_URL !== "http://127.0.0.1:54321") throw new Error("Fixture remota proibida.");
  const run = randomBytes(5).toString("hex");
  const password = randomBytes(24).toString("base64url");
  const actors = {} as Fixtures["actors"];
  for (const name of ["adminA", "adminB", "seller", "buyer", "multi", "orphan", "recovery360", "recovery1440"] as const) {
    const email = `web-${run}-${name.toLowerCase()}@example.test`;
    const response = await fetch(`${config.API_URL}/auth/v1/admin/users`, {
      method: "POST", headers: { apikey: config.SERVICE_ROLE_KEY, Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { role: "admin" } }),
    });
    if (!response.ok) throw new Error("Criação do ator Auth local falhou.");
    const data = await response.json();
    if (typeof data.id !== "string" || !/^[0-9a-f-]{36}$/.test(data.id)) throw new Error("UUID de fixture inválido.");
    actors[name] = { email, id: data.id };
  }
  const provision = (actor: string, letter: string) => JSON.parse(sql(`select private.provision_tenant('${randomUUID()}', '${actor}', 'WEB-${run}-${letter}', 'Fornecedor fictício ${letter}', 'Empresa ${letter} ${run}');`));
  const a = provision(actors.adminA.id, "A");
  const b = provision(actors.adminB.id, "B");
  const ca = randomUUID(), cb = randomUUID();
  const fixture: Fixtures = {
    password, actors, tenantA: a.tenant_id, tenantB: b.tenant_id, memberAdminA: a.membership_id, memberAdminB: b.membership_id,
    memberSeller: randomUUID(), memberBuyer: randomUUID(), memberMultiA: randomUUID(), memberMultiB: randomUUID(),
    companyA: `Empresa A ${run}`, companyB: `Empresa B ${run}`, customerA: `Cliente A ${run}`, customerB: `Cliente B ${run}`,
  };
  sql(`begin;
    insert into public.profiles(user_id, display_name) values ${["seller", "buyer", "multi", "orphan", "recovery360", "recovery1440"].map((name) => `('${actors[name as keyof typeof actors].id}','Pessoa fictícia')`).join(",")};
    insert into public.customers(id,tenant_id,document,name) values ('${ca}','${a.tenant_id}','A-${run}','${fixture.customerA}'),('${cb}','${b.tenant_id}','B-${run}','${fixture.customerB}');
    insert into public.memberships(id,tenant_id,user_id,role,customer_id) values
      ('${fixture.memberSeller}','${a.tenant_id}','${actors.seller.id}','seller',null),
      ('${fixture.memberBuyer}','${a.tenant_id}','${actors.buyer.id}','buyer','${ca}'),
      ('${fixture.memberMultiA}','${a.tenant_id}','${actors.multi.id}','buyer','${ca}'),
      ('${fixture.memberMultiB}','${b.tenant_id}','${actors.multi.id}','buyer','${cb}');
    update public.customers set seller_membership_id='${fixture.memberSeller}' where id='${ca}';
    commit;`);
  // Shared only with test workers, after the app server has started. No file/artifact.
  process.env.E2E_IDENTITY_FIXTURES = JSON.stringify(fixture);
}
