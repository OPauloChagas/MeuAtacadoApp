import { randomUUID } from "node:crypto";
import productSetup, { type ProductFixtures } from "../products/setup";
import { sql } from "../auth/setup";

export type CatalogFixtures = {
  products: ProductFixtures; listA: string; listA2: string; listB: string; listNext: string;
  second: string; huge: string; hidden: string; prefix: string;
};
export default async function setup() {
  await productSetup();
  const products = JSON.parse(process.env.E2E_PRODUCT_FIXTURES!) as ProductFixtures;
  const f: CatalogFixtures = { products, listA: randomUUID(), listA2: randomUUID(), listB: randomUUID(), listNext: randomUUID(),
    second: randomUUID(), huge: randomUUID(), hidden: randomUUID(), prefix: `CAT-${randomUUID().slice(0,8).toUpperCase()}` };
  const a = products.customers.base.tenantA, b = products.customers.base.tenantB;
  sql(`update public.products set min_quantity=2,quantity_multiple=2,category='Salgados %_' where id='${products.productA}';
    insert into public.products(id,tenant_id,sku,name,sales_unit,category) values
    ('${f.second}','${a}','SECOND','Segundo produto','caixa','Doces'),
    ('${f.huge}','${a}','HUGE','Valor exato elevado','caixa','Precisão'),
    ('${f.hidden}','${a}','HIDDEN','Sem preço secreto','caixa','Categoria secreta');
    insert into public.products(tenant_id,sku,name,sales_unit,category)
    select '${a}','${f.prefix}-'||n,'${f.prefix} '||lpad(n::text,2,'0'),'unidade','Paginação' from generate_series(1,25) n;
    update public.products set active=true where id='${products.inactive}';`);
  for (const [list, tenant, price, secondPrice, other] of [
    [f.listA, a, "0.10", "1.11", false], [f.listA2, a, "3.00", "4.00", false],
    [f.listNext, a, "0.20", "2.22", false], [f.listB, b, "9.00", "0", true],
  ] as const) {
    const version = randomUUID();
    sql(`begin;
      insert into public.price_lists(id,tenant_id,name) values('${list}','${tenant}','Tabela ${list}');
      insert into public.price_list_versions(id,tenant_id,price_list_id,version,valid_from) values('${version}','${tenant}','${list}',1,now()-interval '1 day');
      insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) values
      ('${tenant}','${version}','${other ? products.productB : products.productA}','${price}')
      ${other ? "" : `,('${tenant}','${version}','${f.second}','${secondPrice}'),('${tenant}','${version}','${f.huge}','90071992547409.93'),('${tenant}','${version}','${products.inactive}','2.00')`};
      ${other ? "" : `insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) select '${tenant}','${version}',id,'1.00' from public.products where tenant_id='${tenant}' and sku like '${f.prefix}-%';`}
      ${list === f.listA2 ? `insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) values('${tenant}','${version}','${f.hidden}','6.00');` : ""}
      update public.price_list_versions set state='published',published_at=now() where id='${version}';
      commit;`);
  }
  sql(`update public.products set active=false where id='${products.inactive}';
    update public.customers set price_list_id='${f.listA}' where id in ('${products.customers.customerA}','${products.customers.customerDual}');
    update public.customers set price_list_id='${f.listA2}' where id='${products.customers.customerA2}';
    update public.customers set price_list_id='${f.listB}' where id='${products.customers.customerB}';`);
  process.env.E2E_CATALOG_FIXTURES = JSON.stringify(f);
}
