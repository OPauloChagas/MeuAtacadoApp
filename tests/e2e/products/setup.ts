import { randomUUID } from "node:crypto";
import customerSetup, { type CustomerFixtures } from "../customers/setup";
import { sql } from "../auth/setup";
export type ProductFixtures = { customers: CustomerFixtures; productA: string; productB: string; inactive: string; nameA: string; nameB: string; inactiveName: string };
export default async function setup() {
  await customerSetup(); const customers = JSON.parse(process.env.E2E_CUSTOMER_FIXTURES!) as CustomerFixtures;
  const f: ProductFixtures = { customers, productA: randomUUID(), productB: randomUUID(), inactive: randomUUID(), nameA: `Produto A ${randomUUID().slice(0,8)}`, nameB: `Produto exclusivo B ${randomUUID().slice(0,8)}`, inactiveName: `Produto inativo ${randomUUID().slice(0,8)}` };
  sql(`insert into public.products(id,tenant_id,sku,name,sales_unit,active) values
    ('${f.productA}','${customers.base.tenantA}','BASE-A','${f.nameA}','caixa',true),
    ('${f.productB}','${customers.base.tenantB}','BASE-B','${f.nameB}','unidade',true),
    ('${f.inactive}','${customers.base.tenantA}','INACTIVE','${f.inactiveName}','pacote',false);`);
  process.env.E2E_PRODUCT_FIXTURES = JSON.stringify(f);
}
