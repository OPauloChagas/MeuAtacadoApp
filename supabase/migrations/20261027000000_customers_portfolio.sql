begin;

alter table public.customers
  add column contact jsonb not null default '{}' check (jsonb_typeof(contact)='object' and octet_length(contact::text)<=4096),
  add column address jsonb not null default '{}' check (jsonb_typeof(address)='object' and octet_length(address::text)<=4096),
  add column revision bigint not null default 1 check (revision>0),
  add column updated_at timestamptz not null default now(),
  add column document_key text generated always as (upper(regexp_replace(document,'[^A-Za-z0-9]','','g'))) stored,
  add constraint customers_document_key_not_empty check (length(document_key)>0);
create unique index customers_document_normalized_unique on public.customers(tenant_id,document_key);
create index customers_tenant_status on public.customers(tenant_id,status,id);

-- New fields are never exposed by SELECT *. Existing F1 identity reads retain
-- only their minimal columns under RLS; portfolio/private contact needs a DTO.
revoke select on public.customers from authenticated;
grant select (id,tenant_id,document,name,status,created_at) on public.customers to authenticated;
grant insert (id,tenant_id,document,name,contact,address,seller_membership_id) on public.customers to atacado_executor;
grant update (document,name,contact,address,status,seller_membership_id,revision,updated_at) on public.customers to atacado_executor;
create policy customers_insert_admin on public.customers for insert to atacado_executor with check (private.active_admin(tenant_id));
create policy customers_update_authorized on public.customers for update to atacado_executor
  using (private.active_admin(tenant_id) or private.active_membership(seller_membership_id))
  with check (private.active_admin(tenant_id) or private.active_membership(seller_membership_id));

-- The reader role is subject to its nonrecursive, minimal column policies.
create or replace function private.readable_customer(p_tenant_id uuid,p_customer_id uuid,p_seller_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select exists(
  select 1 from public.memberships m
  join public.profiles p on p.user_id=m.user_id and p.status='active'
  join public.tenants t on t.id=m.tenant_id and t.status='active'
  left join public.customers c on c.tenant_id=m.tenant_id and c.id=m.customer_id
  where m.tenant_id=p_tenant_id and m.user_id=private.request_user_id() and m.status='active'
    and (m.role='admin' or (m.role='seller' and m.id=p_seller_id and exists(
      select 1 from public.customers target where target.tenant_id=p_tenant_id and target.id=p_customer_id and target.status='active'))
      or (m.role='buyer' and m.customer_id=p_customer_id and c.status='active'))
); $$;

grant create on schema private to atacado_executor,atacado_membership_reader;
grant create on schema public to atacado_executor;
create function private.customer_seller_valid(p_tenant uuid,p_seller uuid)
returns boolean language sql stable security definer set search_path='' set row_security=on
as $$ select private.active_admin(p_tenant) and (p_seller is null or exists(
  select 1 from public.memberships m join public.profiles p on p.user_id=m.user_id and p.status='active'
  where m.tenant_id=p_tenant and m.id=p_seller and m.role='seller' and m.status='active'));
$$;
alter function private.customer_seller_valid(uuid,uuid) owner to atacado_membership_reader;
revoke all on function private.customer_seller_valid(uuid,uuid) from public,anon,authenticated;
grant execute on function private.customer_seller_valid(uuid,uuid) to atacado_executor;

create function private.customer_document(p_value text)
returns text language sql immutable set search_path=''
as $$ select case when p_value is not null and length(p_value)<=64 and p_value ~ '^[A-Za-z0-9. /[:space:]-]+$'
  and length(regexp_replace(p_value,'[. /[:space:]-]','','g')) between 1 and 32
  then upper(regexp_replace(p_value,'[. /[:space:]-]','','g')) else null end; $$;
create function private.customer_fields_valid(p_value jsonb,p_address boolean)
returns boolean language sql immutable set search_path=''
as $$ select case when p_value is null or jsonb_typeof(p_value)<>'object' then false else
  octet_length(p_value::text)<=4096 and not exists(select 1 from jsonb_each(p_value) e where
    not (e.key=any(case when p_address then array['street','number','district','city','state','postal_code'] else array['email','phone'] end))
    or jsonb_typeof(e.value)<>'string'
    or length(e.value#>>'{}')>case when e.key='email' then 254 when e.key='phone' then 30 when e.key='state' then 2 else 160 end)
  and case when p_address then coalesce(p_value->>'state','') ~ '^([A-Za-z]{2})?$'
    else (coalesce(p_value->>'email','')='' or (p_value->>'email') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
      and coalesce(p_value->>'phone','') ~ '^[+0-9 ()-]*$' end
  end; $$;

create function private.customer_actor(p_membership_id uuid)
returns public.memberships language plpgsql stable set search_path='' set row_security=on
as $$ declare actor public.memberships;
begin
  select m.* into actor from public.memberships m where m.id=p_membership_id
    and m.user_id=private.request_user_id() and private.active_membership(m.id);
  if actor.id is null then raise exception 'ACCESS_DENIED'; end if;
  return actor;
end $$;
create function private.customer_writer(p_membership_id uuid)
returns public.memberships language plpgsql set search_path='' set row_security=on
as $$ declare actor public.memberships;
begin
  actor:=private.customer_actor(p_membership_id);
  if actor.role='admin' then return private.require_admin(p_membership_id); end if;
  if actor.role<>'seller' then raise exception 'ACCESS_DENIED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor.tenant_id::text,26));
  actor:=private.customer_actor(p_membership_id);
  if actor.role<>'seller' then raise exception 'ACCESS_DENIED'; end if;
  return actor;
end $$;

create function public.list_customers(p_membership_id uuid,p_search text default '',p_status text default 'active',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; term text; document_term text; result jsonb;
begin
  actor:=private.customer_actor(p_membership_id);
  if actor.role='buyer' then raise exception 'ACCESS_DENIED'; end if;
  if p_search is null or length(p_search)>100 or p_status is null or p_status not in ('active','inactive','all')
    or p_page is null or p_page<0 or p_page>10000 or p_page_size is null or p_page_size not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  if actor.role='seller' and p_status<>'active' then raise exception 'ACCESS_DENIED'; end if;
  term:=lower(btrim(p_search)); document_term:=upper(regexp_replace(p_search,'[^A-Za-z0-9]','','g'));
  with visible as materialized (
    select c.id,c.name,c.document,c.status,c.revision,c.seller_membership_id from public.customers c
    where c.tenant_id=actor.tenant_id and (actor.role='admin' or (c.seller_membership_id=actor.id and c.status='active'))
      and (p_status='all' or c.status=p_status)
      and (term='' or strpos(lower(c.name),term)>0 or (document_term<>'' and strpos(c.document_key,document_term)>0))
  ), paged as (
    select v.* from visible v order by lower(v.name),v.id limit p_page_size offset p_page*p_page_size
  )
  select jsonb_build_object('items',coalesce((select jsonb_agg(
    jsonb_build_object('id',v.id,'name',v.name,'document',v.document,'status',v.status,'revision',v.revision)
    order by lower(v.name),v.id) from paged v),'[]'::jsonb),
    'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
  return result;
end $$;

create function public.get_customer(p_membership_id uuid,p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; customer public.customers; result jsonb; seller_name text;
begin
  actor:=private.customer_actor(p_membership_id);
  select c.* into customer from public.customers c where c.tenant_id=actor.tenant_id and c.id=p_customer_id
    and (actor.role='admin' or (c.status='active' and ((actor.role='seller' and c.seller_membership_id=actor.id)
      or (actor.role='buyer' and c.id=actor.customer_id))));
  if customer.id is null then raise exception 'ACCESS_DENIED'; end if;
  result:=jsonb_build_object('id',customer.id,'name',customer.name,'document',customer.document,
    'contact',jsonb_strip_nulls(jsonb_build_object('email',customer.contact->'email','phone',customer.contact->'phone')),
    'address',jsonb_strip_nulls(jsonb_build_object('street',customer.address->'street','number',customer.address->'number',
      'district',customer.address->'district','city',customer.address->'city','state',customer.address->'state','postal_code',customer.address->'postal_code')),
    'status',customer.status);
  if actor.role<>'buyer' then result:=result||jsonb_build_object('revision',customer.revision); end if;
  if actor.role='admin' then
    select p.display_name into seller_name from public.memberships m join public.profiles p on p.user_id=m.user_id
      where m.tenant_id=actor.tenant_id and m.id=customer.seller_membership_id;
    result:=result||jsonb_build_object('seller_membership_id',customer.seller_membership_id,'seller_name',seller_name,
      'seller_active',case when customer.seller_membership_id is null then null else private.customer_seller_valid(actor.tenant_id,customer.seller_membership_id) end);
  end if;
  return result;
end $$;

create function public.list_customer_sellers(p_membership_id uuid,p_search text default '',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb;
begin
  actor:=private.customer_actor(p_membership_id);
  if actor.role<>'admin' then raise exception 'ACCESS_DENIED'; end if;
  if p_search is null or length(p_search)>100 or p_page is null or p_page<0 or p_page>10000
    or p_page_size is null or p_page_size not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if;
  with visible as materialized (
    select m.id,p.display_name as name from public.memberships m join public.profiles p on p.user_id=m.user_id
    where m.tenant_id=actor.tenant_id and m.role='seller' and m.status='active' and p.status='active'
      and strpos(lower(p.display_name),lower(btrim(p_search)))>0
  ), paged as (select * from visible order by lower(name),id limit p_page_size offset p_page*p_page_size)
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(v) order by lower(v.name),v.id) from paged v),'[]'::jsonb),
    'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
  return result;
end $$;

create function public.create_customer(p_membership_id uuid,p_document text,p_name text,p_contact jsonb,p_address jsonb,p_seller_membership_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; document text; previous jsonb; result jsonb; customer_id uuid:=gen_random_uuid(); event_id uuid:=gen_random_uuid(); constraint_name text;
begin
  actor:=private.require_admin(p_membership_id); document:=private.customer_document(p_document);
  if document is null or p_name is null or length(btrim(p_name)) not between 1 and 200
    or not private.customer_fields_valid(p_contact,false) or not private.customer_fields_valid(p_address,true) then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'create_customer',p_idempotency_key,
    jsonb_build_array(p_membership_id,p_document,p_name,p_contact,p_address,p_seller_membership_id));
  if previous is not null then return previous; end if;
  if not private.customer_seller_valid(actor.tenant_id,p_seller_membership_id) then raise exception 'SELLER_UNAVAILABLE'; end if;
  insert into public.customers(id,tenant_id,document,name,contact,address,seller_membership_id)
    values(customer_id,actor.tenant_id,document,btrim(p_name),p_contact,p_address,p_seller_membership_id);
  insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
    values(event_id,actor.tenant_id,private.request_user_id(),actor.id,'user','customer.created','customer',customer_id,p_idempotency_key);
  result:=jsonb_build_object('customer_id',customer_id,'revision',1,'audit_event_id',event_id);
  perform private.finish_command(actor.tenant_id,'create_customer',p_idempotency_key,result);
  return result;
exception when unique_violation then
  get stacked diagnostics constraint_name=CONSTRAINT_NAME;
  if constraint_name in ('customers_tenant_id_document_key','customers_document_normalized_unique') then raise exception 'DOCUMENT_IN_USE'; end if;
  raise;
end $$;

create function public.update_customer(p_membership_id uuid,p_customer_id uuid,p_expected_revision bigint,p_document text,p_name text,
  p_contact jsonb,p_address jsonb,p_seller_membership_id uuid,p_status text,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; customer public.customers; document text; previous jsonb; result jsonb; event_id uuid:=gen_random_uuid(); constraint_name text;
begin
  actor:=private.require_admin(p_membership_id); document:=private.customer_document(p_document);
  select c.* into customer from public.customers c where c.id=p_customer_id and c.tenant_id=actor.tenant_id for update;
  if customer.id is null then raise exception 'ACCESS_DENIED'; end if;
  if document is null or p_name is null or length(btrim(p_name)) not between 1 and 200
    or p_expected_revision is null or p_expected_revision<1 or p_status is null or p_status not in ('active','inactive')
    or not private.customer_fields_valid(p_contact,false) or not private.customer_fields_valid(p_address,true) then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'update_customer',p_idempotency_key,
    jsonb_build_array(p_membership_id,p_customer_id,p_expected_revision,p_document,p_name,p_contact,p_address,p_seller_membership_id,p_status));
  if previous is not null then return previous; end if;
  if customer.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  if p_seller_membership_id is distinct from customer.seller_membership_id and not private.customer_seller_valid(actor.tenant_id,p_seller_membership_id) then raise exception 'SELLER_UNAVAILABLE'; end if;
  update public.customers c set document=private.customer_document(p_document),name=btrim(p_name),contact=p_contact,address=p_address,
    seller_membership_id=p_seller_membership_id,status=p_status,revision=c.revision+1,updated_at=clock_timestamp()
    where c.id=customer.id and c.tenant_id=actor.tenant_id;
  insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id,safe_metadata)
    values(event_id,actor.tenant_id,private.request_user_id(),actor.id,'user','customer.updated','customer',customer.id,p_idempotency_key,jsonb_build_object('revision',customer.revision+1));
  result:=jsonb_build_object('customer_id',customer.id,'revision',customer.revision+1,'audit_event_id',event_id);
  perform private.finish_command(actor.tenant_id,'update_customer',p_idempotency_key,result);
  return result;
exception when unique_violation then
  get stacked diagnostics constraint_name=CONSTRAINT_NAME;
  if constraint_name in ('customers_tenant_id_document_key','customers_document_normalized_unique') then raise exception 'DOCUMENT_IN_USE'; end if;
  raise;
end $$;

create function public.update_customer_contacts(p_membership_id uuid,p_customer_id uuid,p_expected_revision bigint,p_contact jsonb,p_address jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; customer public.customers; previous jsonb; result jsonb; event_id uuid:=gen_random_uuid();
begin
  actor:=private.customer_writer(p_membership_id);
  select c.* into customer from public.customers c where c.id=p_customer_id and c.tenant_id=actor.tenant_id for update;
  if customer.id is null or (actor.role='seller' and (customer.status<>'active' or customer.seller_membership_id is distinct from actor.id)) then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 or not private.customer_fields_valid(p_contact,false)
    or not private.customer_fields_valid(p_address,true) then raise exception 'VALIDATION_ERROR'; end if;
  previous:=private.claim_command(actor.tenant_id,'update_customer_contacts',p_idempotency_key,
    jsonb_build_array(p_membership_id,p_customer_id,p_expected_revision,p_contact,p_address));
  if previous is not null then return previous; end if;
  if customer.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  update public.customers c set contact=p_contact,address=p_address,revision=c.revision+1,updated_at=clock_timestamp()
    where c.id=customer.id and c.tenant_id=actor.tenant_id;
  insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id,safe_metadata)
    values(event_id,actor.tenant_id,private.request_user_id(),actor.id,'user','customer.contacts_updated','customer',customer.id,p_idempotency_key,jsonb_build_object('revision',customer.revision+1));
  result:=jsonb_build_object('customer_id',customer.id,'revision',customer.revision+1,'audit_event_id',event_id);
  perform private.finish_command(actor.tenant_id,'update_customer_contacts',p_idempotency_key,result);
  return result;
end $$;

do $migration$
declare signature regprocedure;
begin
  foreach signature in array array[
    'private.customer_document(text)'::regprocedure,'private.customer_fields_valid(jsonb,boolean)'::regprocedure,
    'private.customer_actor(uuid)'::regprocedure,'private.customer_writer(uuid)'::regprocedure,
    'public.list_customers(uuid,text,text,integer,integer)'::regprocedure,'public.get_customer(uuid,uuid)'::regprocedure,
    'public.list_customer_sellers(uuid,text,integer,integer)'::regprocedure,
    'public.create_customer(uuid,text,text,jsonb,jsonb,uuid,uuid)'::regprocedure,
    'public.update_customer(uuid,uuid,bigint,text,text,jsonb,jsonb,uuid,text,uuid)'::regprocedure,
    'public.update_customer_contacts(uuid,uuid,bigint,jsonb,jsonb,uuid)'::regprocedure
  ] loop
    execute format('alter function %s owner to atacado_executor',signature);
    execute format('revoke all on function %s from public,anon,authenticated',signature);
  end loop;
end $migration$;
grant execute on function public.list_customers(uuid,text,text,integer,integer),public.get_customer(uuid,uuid),
  public.list_customer_sellers(uuid,text,integer,integer),public.create_customer(uuid,text,text,jsonb,jsonb,uuid,uuid),
  public.update_customer(uuid,uuid,bigint,text,text,jsonb,jsonb,uuid,text,uuid),public.update_customer_contacts(uuid,uuid,bigint,jsonb,jsonb,uuid)
  to authenticated;
revoke create on schema private from atacado_executor,atacado_membership_reader;
revoke create on schema public from atacado_executor;
comment on table public.customers is 'F2.A: identity, shared business contact/address and portfolio; pricing/payment fields remain future increments.';
notify pgrst,'reload schema';
commit;
