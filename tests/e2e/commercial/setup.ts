import { randomUUID } from "node:crypto";
import productSetup,{ type ProductFixtures } from "../products/setup";
import { sql } from "../auth/setup";
export type CommercialFixtures = { products: ProductFixtures; priceA: string; priceB: string; commissionA: string; commissionB: string; termA: string; termB: string; priceName: string; commissionName: string };
export default async function setup() {
 await productSetup(); const products = JSON.parse(process.env.E2E_PRODUCT_FIXTURES!) as ProductFixtures;
 const run = randomUUID().slice(0,8), f: CommercialFixtures = { products,priceA: randomUUID(),priceB: randomUUID(),commissionA: randomUUID(),commissionB: randomUUID(),termA: randomUUID(),termB: randomUUID(),priceName: `Preço fixture ${run}`,commissionName: `Comissão fixture ${run}` };
 const a = products.customers.base.tenantA,b = products.customers.base.tenantB;
 sql(`insert into public.price_lists(id,tenant_id,name) values('${f.priceA}','${a}','${f.priceName}'),('${f.priceB}','${b}','Segredo B ${run}');
 insert into public.commission_tables(id,tenant_id,name) values('${f.commissionA}','${a}','${f.commissionName}'),('${f.commissionB}','${b}','Comissão B ${run}');
 insert into public.payment_terms(id,tenant_id,name,installments,first_due_days,interval_days) values('${f.termA}','${a}','Prazo fixture ${run}',1,0,0),('${f.termB}','${b}','Prazo secreto B ${run}',1,0,0);
 update public.tenants set timezone='America/New_York' where id='${b}';`);
 process.env.E2E_COMMERCIAL_FIXTURES = JSON.stringify(f);
}
