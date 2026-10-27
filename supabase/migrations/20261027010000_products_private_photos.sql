begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sku text not null check (sku=upper(btrim(sku)) and sku ~ '^[A-Z0-9][A-Z0-9._/-]{0,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  description text not null default '' check (length(description)<=2000),
  category text not null default '' check (length(category)<=100),
  sales_unit text not null check (length(btrim(sales_unit)) between 1 and 32),
  package_content text not null default '' check (length(package_content)<=160),
  min_quantity integer not null default 1 check (min_quantity between 1 and 1000000),
  quantity_multiple integer not null default 1 check (quantity_multiple between 1 and 1000000),
  active boolean not null default true,
  photo_id uuid,
  revision bigint not null default 1 check (revision>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,id), constraint products_sku_unique unique(tenant_id,sku)
);
create index products_tenant_active on public.products(tenant_id,active,id);
create table public.product_photos (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
  product_id uuid not null, actor_user_id uuid not null references public.profiles(user_id) on delete restrict,
  object_path text not null unique,
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  state text not null default 'pending' check (state in ('pending','active','retired')),
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  purged_at timestamptz, created_at timestamptz not null default now(),
  unique(tenant_id,product_id,id),
  foreign key(tenant_id,product_id) references public.products(tenant_id,id) on delete restrict,
  check (object_path=tenant_id::text||'/'||product_id::text||'/'||id::text||'.webp'),
  check (purged_at is null or state='retired')
);
create unique index product_one_pending_photo on public.product_photos(tenant_id,product_id) where state='pending';
create unique index product_one_active_photo on public.product_photos(tenant_id,product_id) where state='active';
alter table public.products add foreign key(tenant_id,id,photo_id) references public.product_photos(tenant_id,product_id,id) on delete restrict;
alter table public.products enable row level security;
alter table public.products force row level security;
alter table public.product_photos enable row level security;
alter table public.product_photos force row level security;
revoke all on public.products,public.product_photos from public,anon,authenticated;
grant select,insert,update on public.products,public.product_photos to atacado_executor;
grant select(id,tenant_id,active) on public.products to atacado_membership_reader;
grant select(id,tenant_id,product_id,actor_user_id,object_path,state,expires_at,purged_at) on public.product_photos to atacado_membership_reader;
create policy product_reader on public.products for select to atacado_membership_reader using(true);
create policy photo_reader on public.product_photos for select to atacado_membership_reader using(true);
grant create on schema private to atacado_executor,atacado_membership_reader;
grant create on schema public to atacado_executor;

create function private.product_internal(p_tenant uuid)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(select 1 from public.memberships m
  join public.profiles p on p.user_id=m.user_id and p.status='active'
  join public.tenants t on t.id=m.tenant_id and t.status='active'
  where m.tenant_id=p_tenant and m.user_id=private.request_user_id() and m.status='active' and m.role in ('admin','seller')); $$;
alter function private.product_internal(uuid) owner to atacado_membership_reader;
revoke all on function private.product_internal(uuid) from public,anon,authenticated;
grant execute on function private.product_internal(uuid) to atacado_executor;
create policy product_read on public.products for select to atacado_executor using(private.product_internal(tenant_id) and (active or private.active_admin(tenant_id)));
create policy product_insert on public.products for insert to atacado_executor with check(private.active_admin(tenant_id));
create policy product_update on public.products for update to atacado_executor using(private.active_admin(tenant_id)) with check(private.active_admin(tenant_id));
create policy photo_read on public.product_photos for select to atacado_executor using(private.product_internal(tenant_id));
create policy photo_insert on public.product_photos for insert to atacado_executor with check(private.active_admin(tenant_id));
create policy photo_update on public.product_photos for update to atacado_executor using(private.active_admin(tenant_id)) with check(private.active_admin(tenant_id));

create function private.guard_product_identity()
returns trigger language plpgsql set search_path=''
as $$ begin
  if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if tg_table_name='product_photos' then
    if new.product_id is distinct from old.product_id or new.object_path is distinct from old.object_path or new.actor_user_id is distinct from old.actor_user_id or new.checksum is distinct from old.checksum then raise exception 'IMMUTABLE_IDENTITY'; end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_product_identity() from public,anon,authenticated;
create trigger products_identity_guard before update on public.products for each row execute function private.guard_product_identity();
create trigger photos_identity_guard before update on public.product_photos for each row execute function private.guard_product_identity();

-- Storage needs sealed boolean bridges; authenticated still has no private USAGE.
create function private.product_file_allowed(p_path text,p_operation text)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(select 1 from public.product_photos f join public.products p on p.tenant_id=f.tenant_id and p.id=f.product_id
  where f.object_path=p_path and f.purged_at is null and
  case p_operation
    when 'read' then (private.active_admin(f.tenant_id) or (f.state='active' and p.active and private.product_internal(f.tenant_id)))
    when 'insert' then private.active_admin(f.tenant_id) and f.actor_user_id=private.request_user_id() and f.state='pending' and f.expires_at>now()
    when 'delete' then private.active_admin(f.tenant_id) and f.state='retired'
    else false end); $$;
alter function private.product_file_allowed(text,text) owner to atacado_membership_reader;
revoke all on function private.product_file_allowed(text,text) from public,anon,authenticated;
grant execute on function private.product_file_allowed(text,text) to authenticated,atacado_executor;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('product-photos','product-photos',false,3000000,array['image/webp']);
create policy product_photo_upload on storage.objects for insert to authenticated
  with check(bucket_id='product-photos' and storage.allow_only_operation('object.upload') and private.product_file_allowed(name,'insert'));
create policy product_photo_download on storage.objects for select to authenticated
  using(bucket_id='product-photos' and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info','object.head_authenticated_info','object.delete','object.delete_many']) and private.product_file_allowed(name,'read'));
create policy product_photo_verify on storage.objects for select to atacado_executor
  using(bucket_id='product-photos' and private.product_file_allowed(name,'read'));
create policy product_photo_delete on storage.objects for delete to authenticated
  using(bucket_id='product-photos' and storage.allow_any_operation(array['object.delete','object.delete_many']) and private.product_file_allowed(name,'delete'));
grant usage on schema storage to atacado_executor;
grant select(bucket_id,name,metadata) on storage.objects to atacado_executor;

create function private.product_input_valid(p_sku text,p_name text,p_description text,p_category text,p_unit text,p_package text,p_min integer,p_multiple integer,p_active boolean)
returns boolean language sql immutable set search_path=''
as $$ select coalesce(upper(btrim(p_sku)) ~ '^[A-Z0-9][A-Z0-9._/-]{0,63}$' and length(btrim(p_name)) between 1 and 200
  and length(p_description)<=2000 and length(p_category)<=100 and length(btrim(p_unit)) between 1 and 32
  and length(p_package)<=160 and p_min between 1 and 1000000 and p_multiple between 1 and 1000000 and p_active is not null,false); $$;
create function private.product_audit(p_actor public.memberships,p_product uuid,p_key uuid,p_action text)
returns uuid language plpgsql set search_path='' set row_security=on
as $$ declare event uuid:=gen_random_uuid(); begin
  insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
    values(event,p_actor.tenant_id,private.request_user_id(),p_actor.id,'user',p_action,'product',p_product,p_key);
  return event;
end $$;

create function public.list_products(p_membership_id uuid,p_search text default '',p_status text default 'active',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb; begin
  actor:=private.customer_actor(p_membership_id);
  if actor.role='buyer' then raise exception 'ACCESS_DENIED'; end if;
  if p_search is null or length(p_search)>100 or p_status is null or p_status not in ('active','inactive','all') or p_page is null or p_page not between 0 and 10000 or p_page_size is null or p_page_size not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  if actor.role='seller' and p_status<>'active' then raise exception 'ACCESS_DENIED'; end if;
  with visible as materialized(select p.id,p.sku,p.name,p.category,p.sales_unit,p.active,p.revision,(p.photo_id is not null) as has_photo
    from public.products p where p.tenant_id=actor.tenant_id and (actor.role='admin' or p.active)
      and (p_status='all' or p.active=(p_status='active'))
      and (strpos(lower(p.name),lower(btrim(p_search)))>0 or strpos(lower(p.sku),lower(btrim(p_search)))>0)),
    paged as(select * from visible order by lower(name),id limit p_page_size offset p_page*p_page_size)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(v) order by lower(name),id) from paged v),'[]'::jsonb),
    'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
  return result;
end $$;
create function public.get_product(p_membership_id uuid,p_product_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb; begin
  actor:=private.customer_actor(p_membership_id);
  if actor.role='buyer' then raise exception 'ACCESS_DENIED'; end if;
  select jsonb_build_object('id',p.id,'sku',p.sku,'name',p.name,'description',p.description,'category',p.category,'sales_unit',p.sales_unit,
    'package_content',p.package_content,'min_quantity',p.min_quantity,'quantity_multiple',p.quantity_multiple,'active',p.active,'revision',p.revision,
    'photo_path',f.object_path) into result
    from public.products p left join public.product_photos f on f.tenant_id=p.tenant_id and f.product_id=p.id and f.id=p.photo_id and f.state='active'
    where p.tenant_id=actor.tenant_id and p.id=p_product_id and (actor.role='admin' or p.active);
  if result is null then raise exception 'ACCESS_DENIED'; end if;
  return result;
end $$;
create function public.create_product(p_membership_id uuid,p_sku text,p_name text,p_description text,p_category text,p_sales_unit text,p_package_content text,p_min_quantity integer,p_quantity_multiple integer,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; result jsonb; id uuid:=gen_random_uuid(); constraint_name text; begin
  actor:=private.require_admin(p_membership_id);
  if not private.product_input_valid(p_sku,p_name,p_description,p_category,p_sales_unit,p_package_content,p_min_quantity,p_quantity_multiple,true) then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'create_product',p_idempotency_key,jsonb_build_array(p_membership_id,p_sku,p_name,p_description,p_category,p_sales_unit,p_package_content,p_min_quantity,p_quantity_multiple));
  if previous is not null then return previous; end if;
  insert into public.products(id,tenant_id,sku,name,description,category,sales_unit,package_content,min_quantity,quantity_multiple)
    values(id,actor.tenant_id,upper(btrim(p_sku)),btrim(p_name),p_description,btrim(p_category),btrim(p_sales_unit),btrim(p_package_content),p_min_quantity,p_quantity_multiple);
  result:=jsonb_build_object('product_id',id,'revision',1,'audit_event_id',private.product_audit(actor,id,p_idempotency_key,'product.created'));
  perform private.finish_command(actor.tenant_id,'create_product',p_idempotency_key,result); return result;
exception when unique_violation then get stacked diagnostics constraint_name=CONSTRAINT_NAME;
  if constraint_name='products_sku_unique' then raise exception 'SKU_IN_USE'; end if; raise;
end $$;
create function public.update_product(p_membership_id uuid,p_product_id uuid,p_expected_revision bigint,p_sku text,p_name text,p_description text,p_category text,p_sales_unit text,p_package_content text,p_min_quantity integer,p_quantity_multiple integer,p_active boolean,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; product public.products; previous jsonb; result jsonb; constraint_name text; begin
  actor:=private.require_admin(p_membership_id);
  select p.* into product from public.products p where p.tenant_id=actor.tenant_id and p.id=p_product_id for update;
  if product.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 or not private.product_input_valid(p_sku,p_name,p_description,p_category,p_sales_unit,p_package_content,p_min_quantity,p_quantity_multiple,p_active) then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'update_product',p_idempotency_key,jsonb_build_array(p_membership_id,p_product_id,p_expected_revision,p_sku,p_name,p_description,p_category,p_sales_unit,p_package_content,p_min_quantity,p_quantity_multiple,p_active));
  if previous is not null then return previous; end if;
  if product.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  update public.products set sku=upper(btrim(p_sku)),name=btrim(p_name),description=p_description,category=btrim(p_category),sales_unit=btrim(p_sales_unit),package_content=btrim(p_package_content),min_quantity=p_min_quantity,quantity_multiple=p_quantity_multiple,active=p_active,revision=revision+1,updated_at=clock_timestamp() where id=product.id and tenant_id=actor.tenant_id;
  result:=jsonb_build_object('product_id',product.id,'revision',product.revision+1,'audit_event_id',private.product_audit(actor,product.id,p_idempotency_key,'product.updated'));
  perform private.finish_command(actor.tenant_id,'update_product',p_idempotency_key,result); return result;
exception when unique_violation then get stacked diagnostics constraint_name=CONSTRAINT_NAME;
  if constraint_name='products_sku_unique' then raise exception 'SKU_IN_USE'; end if; raise;
end $$;

create function public.prepare_product_photo(p_membership_id uuid,p_product_id uuid,p_expected_revision bigint,p_checksum text,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; product public.products; previous jsonb; result jsonb; photo uuid:=gen_random_uuid(); path text; begin
  actor:=private.require_admin(p_membership_id);
  select p.* into product from public.products p where p.tenant_id=actor.tenant_id and p.id=p_product_id for update;
  if product.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 or p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'prepare_product_photo',p_idempotency_key,jsonb_build_array(p_membership_id,p_product_id,p_expected_revision,p_checksum));
  if previous is not null then return previous; end if;
  if product.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  update public.product_photos set state='retired' where tenant_id=actor.tenant_id and product_id=product.id and state='pending' and expires_at<=now();
  if exists(select 1 from public.product_photos where tenant_id=actor.tenant_id and product_id=product.id and state='pending') then raise exception 'PHOTO_IN_PROGRESS'; end if;
  path:=actor.tenant_id::text||'/'||product.id::text||'/'||photo::text||'.webp';
  insert into public.product_photos(id,tenant_id,product_id,actor_user_id,object_path,checksum) values(photo,actor.tenant_id,product.id,private.request_user_id(),path,p_checksum);
  result:=jsonb_build_object('photo_id',photo,'object_path',path,'audit_event_id',private.product_audit(actor,product.id,p_idempotency_key,'product.photo_prepared'));
  perform private.finish_command(actor.tenant_id,'prepare_product_photo',p_idempotency_key,result); return result;
end $$;
create function public.set_product_photo(p_membership_id uuid,p_product_id uuid,p_expected_revision bigint,p_photo_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; product public.products; photo public.product_photos; previous jsonb; result jsonb; begin
  actor:=private.require_admin(p_membership_id);
  select p.* into product from public.products p where p.tenant_id=actor.tenant_id and p.id=p_product_id for update;
  if product.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'set_product_photo',p_idempotency_key,jsonb_build_array(p_membership_id,p_product_id,p_expected_revision,p_photo_id));
  if previous is not null then return previous; end if;
  if product.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  if p_photo_id is not null then
    select f.* into photo from public.product_photos f where f.id=p_photo_id and f.tenant_id=actor.tenant_id and f.product_id=product.id and f.actor_user_id=private.request_user_id() and f.state='pending' and f.expires_at>now() for update;
    if photo.id is null then raise exception 'PHOTO_UNAVAILABLE'; end if;
    if not exists(select 1 from storage.objects o where o.bucket_id='product-photos' and o.name=photo.object_path and o.metadata->>'mimetype'='image/webp' and (o.metadata->>'size')::bigint between 1 and 3000000) then raise exception 'PHOTO_UNAVAILABLE'; end if;
  end if;
  update public.product_photos set state='retired' where tenant_id=actor.tenant_id and product_id=product.id and state='active';
  if p_photo_id is not null then update public.product_photos set state='active' where tenant_id=actor.tenant_id and id=photo.id; end if;
  update public.products set photo_id=p_photo_id,revision=revision+1,updated_at=clock_timestamp() where tenant_id=actor.tenant_id and id=product.id;
  result:=jsonb_build_object('product_id',product.id,'revision',product.revision+1,'audit_event_id',private.product_audit(actor,product.id,p_idempotency_key,'product.photo_changed'));
  perform private.finish_command(actor.tenant_id,'set_product_photo',p_idempotency_key,result); return result;
end $$;
create function public.retire_product_photo(p_membership_id uuid,p_product_id uuid,p_photo_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; product public.products; result jsonb; begin
  actor:=private.require_admin(p_membership_id);
  select p.* into product from public.products p where p.tenant_id=actor.tenant_id and p.id=p_product_id for update;
  if product.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_photo_id is not null and not exists(select 1 from public.product_photos f where f.tenant_id=actor.tenant_id and f.product_id=product.id and f.id=p_photo_id and f.state<>'active' and (f.actor_user_id=private.request_user_id() or f.expires_at<=now())) then raise exception 'ACCESS_DENIED'; end if;
  update public.product_photos set state='retired' where tenant_id=actor.tenant_id and product_id=product.id and state='pending' and (expires_at<=now() or id=p_photo_id);
  select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'object_path',f.object_path)),'[]'::jsonb) into result from
    (select id,object_path from public.product_photos where tenant_id=actor.tenant_id and product_id=product.id and state='retired' and purged_at is null order by created_at,id limit 100) f;
  return result;
end $$;
create function public.finish_product_photo_cleanup(p_membership_id uuid,p_product_id uuid,p_photo_ids uuid[])
returns void language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; begin
  actor:=private.require_admin(p_membership_id);
  perform 1 from public.products where tenant_id=actor.tenant_id and id=p_product_id for update;
  if not found then raise exception 'ACCESS_DENIED'; end if;
  if p_photo_ids is null or cardinality(p_photo_ids) not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  if exists(select 1 from unnest(p_photo_ids) i where not exists(select 1 from public.product_photos f where f.id=i and f.tenant_id=actor.tenant_id and f.product_id=p_product_id and f.state='retired')) then raise exception 'ACCESS_DENIED'; end if;
  if exists(select 1 from storage.objects o join public.product_photos f on f.object_path=o.name and o.bucket_id='product-photos' where f.id=any(p_photo_ids) and f.tenant_id=actor.tenant_id) then raise exception 'PHOTO_UNAVAILABLE'; end if;
  update public.product_photos set purged_at=coalesce(purged_at,clock_timestamp()) where tenant_id=actor.tenant_id and product_id=p_product_id and id=any(p_photo_ids);
end $$;

do $migration$ declare signature regprocedure; begin
  foreach signature in array array[
    'private.product_input_valid(text,text,text,text,text,text,integer,integer,boolean)'::regprocedure,'private.product_audit(public.memberships,uuid,uuid,text)'::regprocedure,
    'public.list_products(uuid,text,text,integer,integer)'::regprocedure,'public.get_product(uuid,uuid)'::regprocedure,
    'public.create_product(uuid,text,text,text,text,text,text,integer,integer,uuid)'::regprocedure,
    'public.update_product(uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,boolean,uuid)'::regprocedure,
    'public.prepare_product_photo(uuid,uuid,bigint,text,uuid)'::regprocedure,'public.set_product_photo(uuid,uuid,bigint,uuid,uuid)'::regprocedure,
    'public.retire_product_photo(uuid,uuid,uuid)'::regprocedure,'public.finish_product_photo_cleanup(uuid,uuid,uuid[])'::regprocedure
  ] loop execute format('alter function %s owner to atacado_executor',signature); execute format('revoke all on function %s from public,anon,authenticated',signature); end loop;
end $migration$;
grant execute on function public.list_products(uuid,text,text,integer,integer),public.get_product(uuid,uuid),
  public.create_product(uuid,text,text,text,text,text,text,integer,integer,uuid),public.update_product(uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,boolean,uuid),
  public.prepare_product_photo(uuid,uuid,bigint,text,uuid),public.set_product_photo(uuid,uuid,bigint,uuid,uuid),public.retire_product_photo(uuid,uuid,uuid),public.finish_product_photo_cleanup(uuid,uuid,uuid[]) to authenticated;
revoke create on schema private from atacado_executor,atacado_membership_reader;
revoke create on schema public from atacado_executor;
commit;
