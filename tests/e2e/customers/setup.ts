import { randomUUID } from "node:crypto";
import identitySetup, { sql, type Fixtures } from "../auth/setup";

export type CustomerFixtures = {
  base: Fixtures; customerA: string; customerA2: string; customerDual: string; customerB: string;
  seller2: string; sellerB: string; dualAdmin: string; dualSeller: string; otherBuyer: string;
  customerA2Name: string; dualName: string;
};

export default async function setup() {
  await identitySetup();
  const base = JSON.parse(process.env.E2E_IDENTITY_FIXTURES!) as Fixtures;
  const a = sql(`select id from public.customers where tenant_id='${base.tenantA}';`);
  const b = sql(`select id from public.customers where tenant_id='${base.tenantB}';`);
  const f: CustomerFixtures = { base, customerA: a, customerB: b, customerA2: randomUUID(), customerDual: randomUUID(),
    seller2: randomUUID(), sellerB: randomUUID(), dualAdmin: randomUUID(), dualSeller: randomUUID(), otherBuyer: randomUUID(),
    customerA2Name: `Cliente fora da carteira ${base.tenantA}`, dualName: `Cliente do contexto duplo ${base.tenantA}` };
  sql(`begin;
    update public.profiles set display_name='Vendedor principal A' where user_id='${base.actors.seller.id}';
    update public.profiles set display_name='Vendedor secundário A' where user_id='${base.actors.orphan.id}';
    update public.profiles set display_name='Vendedor de contexto duplo' where user_id='${base.actors.recovery360.id}';
    insert into public.customers(id,tenant_id,document,name) values
      ('${f.customerA2}','${base.tenantA}','A2-${randomUUID().slice(0,8)}','${f.customerA2Name}'),
      ('${f.customerDual}','${base.tenantA}','DUAL-${randomUUID().slice(0,8)}','${f.dualName}');
    insert into public.memberships(id,tenant_id,user_id,role,customer_id) values
      ('${f.seller2}','${base.tenantA}','${base.actors.orphan.id}','seller',null),
      ('${f.sellerB}','${base.tenantB}','${base.actors.adminB.id}','seller',null),
      ('${f.dualAdmin}','${base.tenantA}','${base.actors.recovery360.id}','admin',null),
      ('${f.dualSeller}','${base.tenantA}','${base.actors.recovery360.id}','seller',null),
      ('${f.otherBuyer}','${base.tenantA}','${base.actors.recovery1440.id}','buyer','${f.customerA2}');
    update public.customers set seller_membership_id='${f.dualSeller}' where id='${f.customerDual}';
    commit;`);
  process.env.E2E_CUSTOMER_FIXTURES = JSON.stringify(f);
}
