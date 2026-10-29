begin;
grant create on schema private to atacado_executor,atacado_membership_reader;
grant create on schema public to atacado_executor;
grant select(price_list_id) on public.customers to atacado_membership_reader;
grant select(id,tenant_id,active) on public.price_lists to atacado_membership_reader;
grant select(id,tenant_id,price_list_id,state,valid_from,valid_until) on public.price_list_versions to atacado_membership_reader;
grant select(tenant_id,version_id,product_id) on public.price_list_items to atacado_membership_reader;
create policy catalog_list_reader on public.price_lists for select to atacado_membership_reader using(true);
create policy catalog_version_reader on public.price_list_versions for select to atacado_membership_reader using(true);
create policy catalog_item_reader on public.price_list_items for select to atacado_membership_reader using(true);

create function private.catalog_list_allowed(p_tenant uuid,p_list uuid)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(select 1 from public.customers c
 join public.price_lists l on l.tenant_id=c.tenant_id and l.id=c.price_list_id and l.active
 join public.memberships m on m.tenant_id=c.tenant_id and m.user_id=private.request_user_id() and m.status='active'
 join public.profiles p on p.user_id=m.user_id and p.status='active'
 join public.tenants t on t.id=m.tenant_id and t.status='active'
 where c.tenant_id=p_tenant and c.price_list_id=p_list and c.status='active'
 and (m.role='admin' or (m.role='seller' and c.seller_membership_id=m.id) or (m.role='buyer' and c.id=m.customer_id))); $$;
alter function private.catalog_list_allowed(uuid,uuid) owner to atacado_membership_reader;
revoke all on function private.catalog_list_allowed(uuid,uuid) from public,anon,authenticated;
grant execute on function private.catalog_list_allowed(uuid,uuid) to atacado_executor;

create function private.catalog_product_allowed(p_tenant uuid,p_product uuid)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(select 1 from public.products p
 join public.price_list_items i on i.tenant_id=p.tenant_id and i.product_id=p.id
 join public.price_list_versions v on v.tenant_id=i.tenant_id and v.id=i.version_id
 where p.tenant_id=p_tenant and p.id=p_product and p.active and v.state='published'
 and v.valid_from<=statement_timestamp() and (v.valid_until is null or v.valid_until>statement_timestamp())
 and private.catalog_list_allowed(v.tenant_id,v.price_list_id)); $$;
alter function private.catalog_product_allowed(uuid,uuid) owner to atacado_membership_reader;
revoke all on function private.catalog_product_allowed(uuid,uuid) from public,anon,authenticated;
grant execute on function private.catalog_product_allowed(uuid,uuid) to atacado_executor;

create policy catalog_lists on public.price_lists for select to atacado_executor using(private.catalog_list_allowed(tenant_id,id));
create policy catalog_versions on public.price_list_versions for select to atacado_executor
 using(state='published' and valid_from<=statement_timestamp() and (valid_until is null or valid_until>statement_timestamp()) and private.catalog_list_allowed(tenant_id,price_list_id));
create policy catalog_items on public.price_list_items for select to atacado_executor
 using(exists(select 1 from public.price_list_versions v where v.tenant_id=price_list_items.tenant_id and v.id=price_list_items.version_id
 and v.state='published' and v.valid_from<=statement_timestamp() and (v.valid_until is null or v.valid_until>statement_timestamp()) and private.catalog_list_allowed(v.tenant_id,v.price_list_id)));
create policy catalog_products on public.products for select to atacado_executor using(active and private.catalog_product_allowed(tenant_id,id));
create policy catalog_photos on public.product_photos for select to atacado_executor using(state='active' and private.catalog_product_allowed(tenant_id,product_id));

create or replace function private.product_file_allowed(p_path text,p_operation text)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(select 1 from public.product_photos f join public.products p on p.tenant_id=f.tenant_id and p.id=f.product_id
 where f.object_path=p_path and f.purged_at is null and
 case p_operation
 when 'read' then private.active_admin(f.tenant_id) or (f.state='active' and p.active and (private.product_internal(f.tenant_id) or private.catalog_product_allowed(f.tenant_id,p.id)))
 when 'insert' then private.active_admin(f.tenant_id) and f.actor_user_id=private.request_user_id() and f.state='pending' and f.expires_at>now()
 when 'delete' then private.active_admin(f.tenant_id) and f.state='retired'
 else false end); $$;

create function private.catalog_context(p_membership uuid,p_customer uuid)
returns jsonb language plpgsql stable set search_path='' set row_security=on
as $$ declare actor public.memberships; customer public.customers; version uuid; begin
 actor:=private.customer_actor(p_membership);
 if actor.role='buyer' and p_customer is not null and p_customer<>actor.customer_id then raise exception 'ACCESS_DENIED'; end if;
 select c.* into customer from public.customers c where c.tenant_id=actor.tenant_id and c.id=coalesce(p_customer,actor.customer_id) and c.status='active'
 and (actor.role='admin' or (actor.role='seller' and c.seller_membership_id=actor.id) or (actor.role='buyer' and c.id=actor.customer_id));
 if customer.id is null then raise exception 'ACCESS_DENIED'; end if;
 select v.id into version from public.price_lists l join public.price_list_versions v on v.tenant_id=l.tenant_id and v.price_list_id=l.id
 where l.tenant_id=actor.tenant_id and l.id=customer.price_list_id and l.active and v.state='published'
 and v.valid_from<=statement_timestamp() and (v.valid_until is null or v.valid_until>statement_timestamp());
 return jsonb_build_object('tenant_id',actor.tenant_id,'customer_id',customer.id,'customer_name',customer.name,'revision',customer.revision,'list_id',customer.price_list_id,'version_id',version);
end $$;
create function private.catalog_product_json(p public.products,p_price numeric)
returns jsonb language sql immutable set search_path=''
as $$ select jsonb_build_object('id',p.id,'sku',p.sku,'name',p.name,'description',p.description,'category',p.category,'sales_unit',p.sales_unit,
 'package_content',p.package_content,'min_quantity',p.min_quantity,'quantity_multiple',p.quantity_multiple,'has_photo',p.photo_id is not null,'unit_price',p_price::text); $$;

create function public.list_catalog(p_membership_id uuid,p_customer_id uuid default null,p_search text default '',p_category text default '',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare ctx jsonb; result jsonb; begin
 ctx:=private.catalog_context(p_membership_id,p_customer_id);
 perform private.commercial_page(p_search,p_page,p_page_size);
 if p_category is null or length(p_category)>100 then raise exception 'VALIDATION_ERROR'; end if;
 with visible as materialized(select p as product,i.unit_price from public.products p join public.price_list_items i on i.tenant_id=p.tenant_id and i.product_id=p.id
 where p.tenant_id=(ctx->>'tenant_id')::uuid and i.version_id=(ctx->>'version_id')::uuid and p.active
 and (strpos(lower(p.name),lower(btrim(p_search)))>0 or strpos(lower(p.sku),lower(btrim(p_search)))>0)
 and strpos(lower(p.category),lower(btrim(p_category)))>0),
 paged as(select * from visible order by lower((product).name),(product).id limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('customer',jsonb_build_object('id',ctx->>'customer_id','name',ctx->>'customer_name'),
 'availability',case when ctx->>'version_id' is null then 'unavailable' else 'ready' end,
 'items',coalesce((select jsonb_agg(private.catalog_product_json(p.product,p.unit_price) order by lower((p.product).name),(p.product).id) from paged p),'[]'::jsonb),
 'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
 return result;
end $$;

create function public.get_catalog_photo(p_membership_id uuid,p_product_id uuid,p_customer_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare ctx jsonb; result jsonb; begin
 ctx:=private.catalog_context(p_membership_id,p_customer_id);
 select jsonb_build_object('product_id',p.id,'photo_id',f.id) into result from public.products p
 join public.price_list_items i on i.tenant_id=p.tenant_id and i.product_id=p.id and i.version_id=(ctx->>'version_id')::uuid
 join public.product_photos f on f.tenant_id=p.tenant_id and f.product_id=p.id and f.id=p.photo_id and f.state='active' and f.purged_at is null
 where p.tenant_id=(ctx->>'tenant_id')::uuid and p.id=p_product_id and p.active;
 if result is null then raise exception 'PHOTO_UNAVAILABLE'; end if; return result;
end $$;

create function public.quote_catalog(p_membership_id uuid,p_items jsonb,p_customer_id uuid default null,p_expected_token text default null)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare ctx jsonb; entry jsonb; item record; product public.products; price numeric; amount numeric; total numeric:=0;
 lines jsonb:='[]'::jsonb; facts jsonb:='[]'::jsonb; token text; begin
 ctx:=private.catalog_context(p_membership_id,p_customer_id);
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'VALIDATION_ERROR'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 or octet_length(p_items::text)>65536
 or (p_expected_token is not null and p_expected_token !~ '^[a-f0-9]{64}$') then raise exception 'VALIDATION_ERROR'; end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'VALIDATION_ERROR'; end if;
  if (select count(*) from jsonb_object_keys(entry))<>2 or not(entry ? 'product_id' and entry ? 'quantity')
  or jsonb_typeof(entry->'product_id')<>'string' or coalesce(entry->>'product_id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  or jsonb_typeof(entry->'quantity')<>'number' or coalesce(entry->>'quantity','') !~ '^[0-9]{1,7}$' then raise exception 'VALIDATION_ERROR'; end if;
  if (entry->>'quantity')::integer not between 1 and 1000000 then raise exception 'VALIDATION_ERROR'; end if;
 end loop;
 if ctx->>'version_id' is null then raise exception 'PRICING_UNAVAILABLE'; end if;
 for item in select (value->>'product_id')::uuid as product_id,sum((value->>'quantity')::integer) as quantity
 from jsonb_array_elements(p_items) group by (value->>'product_id')::uuid order by (value->>'product_id')::uuid loop
  if item.quantity>1000000 then raise exception 'QUANTITY_INVALID'; end if;
  select p.* into product from public.products p where p.tenant_id=(ctx->>'tenant_id')::uuid and p.id=item.product_id and p.active;
  select i.unit_price into price from public.price_list_items i where i.tenant_id=(ctx->>'tenant_id')::uuid and i.version_id=(ctx->>'version_id')::uuid and i.product_id=item.product_id;
  if product.id is null or price is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if item.quantity<product.min_quantity or item.quantity%product.quantity_multiple<>0 then raise exception 'QUANTITY_INVALID'; end if;
  amount:=price*item.quantity; total:=total+amount;
  if total>9999999999999999.99 then raise exception 'AMOUNT_LIMIT'; end if;
  lines:=lines||jsonb_build_array(jsonb_build_object('product_id',product.id,'sku',product.sku,'name',product.name,'sales_unit',product.sales_unit,'package_content',product.package_content,
   'quantity',item.quantity,'unit_price',price::text,'line_total',amount::text));
  facts:=facts||jsonb_build_array(jsonb_build_array(product.id,product.revision,item.quantity,price));
 end loop;
 token:=encode(extensions.digest(jsonb_build_array(private.request_user_id(),p_membership_id,ctx,facts)::text,'sha256'),'hex');
 return jsonb_build_object('status',case when p_expected_token is not null and token<>p_expected_token then 'price_changed' else 'current' end,
 'quote_token',token,'generated_at',statement_timestamp(),'items',lines,'total',total::text);
end $$;

do $migration$ declare signature regprocedure; begin
 foreach signature in array array['private.catalog_context(uuid,uuid)'::regprocedure,'private.catalog_product_json(public.products,numeric)'::regprocedure,
 'public.list_catalog(uuid,uuid,text,text,integer,integer)'::regprocedure,'public.get_catalog_photo(uuid,uuid,uuid)'::regprocedure,'public.quote_catalog(uuid,jsonb,uuid,text)'::regprocedure] loop
  execute format('alter function %s owner to atacado_executor',signature);
  execute format('revoke all on function %s from public,anon,authenticated',signature);
  if (select pronamespace='public'::regnamespace from pg_proc where oid=signature::oid) then execute format('grant execute on function %s to authenticated',signature); end if;
 end loop;
end $migration$;
revoke create on schema public from atacado_executor;
revoke create on schema private from atacado_executor,atacado_membership_reader;
commit;
