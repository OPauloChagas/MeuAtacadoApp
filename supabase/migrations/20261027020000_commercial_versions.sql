begin;
create extension if not exists btree_gist with schema extensions;

create table public.price_lists (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 100), active boolean not null default true,
 next_version integer not null default 1 check(next_version>0), revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id)
);
create unique index price_lists_name_unique on public.price_lists(tenant_id,lower(btrim(name)));
create table public.commission_tables (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 100), active boolean not null default true,
 next_version integer not null default 1 check(next_version>0), revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id)
);
create unique index commission_tables_name_unique on public.commission_tables(tenant_id,lower(btrim(name)));
create table public.price_list_versions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, price_list_id uuid not null,
 version integer not null check(version>0), state text not null default 'draft' check(state in ('draft','published')),
 valid_from timestamptz, valid_until timestamptz, revision bigint not null default 1 check(revision>0),
 published_at timestamptz, created_at timestamptz not null default now(),
 unique(tenant_id,id), unique(tenant_id,price_list_id,version),
 foreign key(tenant_id,price_list_id) references public.price_lists(tenant_id,id) on delete restrict,
 check(valid_from is null or valid_until is null or valid_until>valid_from),
 check((state='draft' and published_at is null) or (state='published' and published_at is not null and valid_from is not null)),
 constraint price_versions_period_exclusion exclude using gist
 (tenant_id extensions.gist_uuid_ops with =, price_list_id extensions.gist_uuid_ops with =, tstzrange(valid_from,valid_until,'[)') with &&) where(state='published')
);
create table public.commission_versions (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, table_id uuid not null,
 version integer not null check(version>0), state text not null default 'draft' check(state in ('draft','published')),
 valid_from timestamptz, valid_until timestamptz, default_rate numeric(7,4) not null check(default_rate between 0 and 100),
 revision bigint not null default 1 check(revision>0), published_at timestamptz, created_at timestamptz not null default now(),
 unique(tenant_id,id), unique(tenant_id,table_id,version),
 foreign key(tenant_id,table_id) references public.commission_tables(tenant_id,id) on delete restrict,
 check(valid_from is null or valid_until is null or valid_until>valid_from),
 check((state='draft' and published_at is null) or (state='published' and published_at is not null and valid_from is not null)),
 constraint commission_versions_period_exclusion exclude using gist
 (tenant_id extensions.gist_uuid_ops with =, table_id extensions.gist_uuid_ops with =, tstzrange(valid_from,valid_until,'[)') with &&) where(state='published')
);
create table public.price_list_items (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, version_id uuid not null, product_id uuid not null,
 unit_price numeric(18,2) not null check(unit_price>0), created_at timestamptz not null default now(),
 unique(tenant_id,version_id,product_id),
 foreign key(tenant_id,version_id) references public.price_list_versions(tenant_id,id) on delete restrict,
 foreign key(tenant_id,product_id) references public.products(tenant_id,id) on delete restrict
);
create table public.commission_items (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, version_id uuid not null, product_id uuid not null,
 rate numeric(7,4) not null check(rate between 0 and 100), created_at timestamptz not null default now(),
 unique(tenant_id,version_id,product_id),
 foreign key(tenant_id,version_id) references public.commission_versions(tenant_id,id) on delete restrict,
 foreign key(tenant_id,product_id) references public.products(tenant_id,id) on delete restrict
);
create table public.payment_terms (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 100), installments integer not null check(installments between 1 and 12),
 first_due_days integer not null check(first_due_days between 0 and 365), interval_days integer not null,
 active boolean not null default true, revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,id),
 check((installments=1 and interval_days=0) or (installments>1 and interval_days between 1 and 365))
);
create unique index payment_terms_name_unique on public.payment_terms(tenant_id,lower(btrim(name)));
create table public.seller_commission_assignments (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, seller_membership_id uuid not null, table_id uuid not null,
 valid_from timestamptz not null, valid_until timestamptz, cancelled_at timestamptz,
 revision bigint not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,id), check(valid_until is null or valid_until>valid_from),
 foreign key(tenant_id,seller_membership_id) references public.memberships(tenant_id,id) on delete restrict,
 foreign key(tenant_id,table_id) references public.commission_tables(tenant_id,id) on delete restrict,
 constraint seller_commission_period_exclusion exclude using gist
 (tenant_id extensions.gist_uuid_ops with =, seller_membership_id extensions.gist_uuid_ops with =, tstzrange(valid_from,valid_until,'[)') with &&) where(cancelled_at is null)
);
alter table public.customers add column price_list_id uuid, add column payment_term_id uuid,
 add foreign key(tenant_id,price_list_id) references public.price_lists(tenant_id,id) on delete restrict,
 add foreign key(tenant_id,payment_term_id) references public.payment_terms(tenant_id,id) on delete restrict;
grant update(price_list_id,payment_term_id) on public.customers to atacado_executor;
create index customers_price_list on public.customers(tenant_id,price_list_id);
create index customers_payment_term on public.customers(tenant_id,payment_term_id);
create index price_items_product on public.price_list_items(tenant_id,product_id);
create index commission_items_product on public.commission_items(tenant_id,product_id);
create index seller_assignments_table on public.seller_commission_assignments(tenant_id,table_id);

do $migration$ declare relation text; begin
 foreach relation in array array['price_lists','price_list_versions','price_list_items','commission_tables','commission_versions','commission_items','payment_terms','seller_commission_assignments'] loop
  execute format('alter table public.%I enable row level security',relation);
  execute format('alter table public.%I force row level security',relation);
  execute format('revoke all on public.%I from public,anon,authenticated',relation);
  execute format('grant select,insert,update on public.%I to atacado_executor',relation);
  execute format('create policy commercial_admin on public.%I for all to atacado_executor using(private.active_admin(tenant_id)) with check(private.active_admin(tenant_id))',relation);
 end loop;
end $migration$;
grant delete on public.price_list_items,public.commission_items to atacado_executor;
grant create on schema private,public to atacado_executor;

create function private.commercial_actor(p_membership uuid)
returns public.memberships language plpgsql stable set search_path='' set row_security=on
as $$ declare actor public.memberships; begin
 actor:=private.customer_actor(p_membership); if actor.role<>'admin' then raise exception 'ACCESS_DENIED'; end if; return actor;
end $$;
create function private.commercial_decimal(p_value jsonb,p_rate boolean)
returns numeric language plpgsql immutable set search_path=''
as $$ declare value text; amount numeric; begin
 if coalesce(jsonb_typeof(p_value),'')<>'string' then return null; end if;
 value:=p_value#>>'{}';
 if p_rate then if value !~ '^[0-9]{1,3}(\.[0-9]{1,4})?$' then return null; end if;
 else if value !~ '^[0-9]{1,16}(\.[0-9]{1,2})?$' then return null; end if; end if;
 amount:=value::numeric;
 if (p_rate and amount not between 0 and 100) or (not p_rate and amount<=0) then return null; end if;
 return amount;
end $$;
create function private.commercial_day(p_tenant uuid,p_day date)
returns timestamptz language plpgsql stable set search_path='' set row_security=on
as $$ declare zone text; begin
 if p_day is not null and p_day not between '1900-01-01'::date and '9999-12-31'::date then raise exception 'VALIDATION_ERROR'; end if;
 select t.timezone into zone from public.tenants t where t.id=p_tenant;
 return p_day::timestamp at time zone zone;
end $$;
create function private.commercial_page(p_search text,p_page integer,p_size integer)
returns void language plpgsql immutable set search_path=''
as $$ begin if p_search is null or length(p_search)>100 or p_page is null or p_page not between 0 and 10000 or p_size is null or p_size not between 1 and 100 then raise exception 'VALIDATION_ERROR'; end if; end $$;
create function private.commercial_result(p_actor public.memberships,p_id uuid,p_revision bigint,p_key uuid,p_operation text,p_action text)
returns jsonb language plpgsql set search_path='' set row_security=on
as $$ declare event uuid:=gen_random_uuid(); result jsonb; begin
 insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
 values(event,p_actor.tenant_id,private.request_user_id(),p_actor.id,'user',p_action,'commercial',p_id,p_key);
 result:=jsonb_build_object('id',p_id,'revision',p_revision,'audit_event_id',event);
 perform private.finish_command(p_actor.tenant_id,p_operation,p_key,result); return result;
end $$;
create function private.guard_commercial_identity()
returns trigger language plpgsql set search_path=''
as $$ begin
 if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id then raise exception 'IMMUTABLE_IDENTITY'; end if;
 if tg_table_name='seller_commission_assignments' then
  if new.seller_membership_id is distinct from old.seller_membership_id or new.table_id is distinct from old.table_id or new.valid_from is distinct from old.valid_from then raise exception 'IMMUTABLE_IDENTITY'; end if;
 end if; return new;
end $$;
create function private.guard_commercial_version()
returns trigger language plpgsql set search_path='' set row_security=on
as $$ begin
 if tg_op='INSERT' then if new.state<>'draft' then raise exception 'PUBLISHED_IMMUTABLE'; end if; return new; end if;
 if tg_op='DELETE' or old.state='published' then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or new.version is distinct from old.version then raise exception 'IMMUTABLE_IDENTITY'; end if;
 if tg_table_name='price_list_versions' then
  if new.price_list_id is distinct from old.price_list_id then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if new.state='published' then
   if not exists(select 1 from public.price_list_items i where i.tenant_id=new.tenant_id and i.version_id=new.id) then raise exception 'EMPTY_VERSION'; end if;
   if exists(select 1 from public.price_list_items i join public.products p on p.tenant_id=i.tenant_id and p.id=i.product_id where i.tenant_id=new.tenant_id and i.version_id=new.id and not p.active) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  end if;
 else
  if new.table_id is distinct from old.table_id then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if new.state='published' and exists(select 1 from public.commission_items i join public.products p on p.tenant_id=i.tenant_id and p.id=i.product_id where i.tenant_id=new.tenant_id and i.version_id=new.id and not p.active) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
 end if; return new;
end $$;
create function private.guard_commercial_item()
returns trigger language plpgsql set search_path='' set row_security=on
as $$ declare target_tenant uuid; target_version uuid; state text; begin
 if tg_op='DELETE' then target_tenant:=old.tenant_id; target_version:=old.version_id; else target_tenant:=new.tenant_id; target_version:=new.version_id; end if;
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.tenant_id is distinct from old.tenant_id or new.version_id is distinct from old.version_id or new.product_id is distinct from old.product_id) then raise exception 'IMMUTABLE_IDENTITY'; end if;
 if tg_table_name='price_list_items' then select v.state into state from public.price_list_versions v where v.tenant_id=target_tenant and v.id=target_version for update;
 else select v.state into state from public.commission_versions v where v.tenant_id=target_tenant and v.id=target_version for update; end if;
 if state is distinct from 'draft' then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create function private.guard_commission_seller_role()
returns trigger language plpgsql set search_path='' set row_security=on
as $$ begin if new.role is distinct from old.role and exists(select 1 from public.seller_commission_assignments a where a.tenant_id=old.tenant_id and a.seller_membership_id=old.id) then raise exception using message='REFERENCED_SELLER_IMMUTABLE',errcode='23514'; end if; return new; end $$;
create trigger commission_seller_identity before update of role on public.memberships for each row execute function private.guard_commission_seller_role();
create trigger price_identity before update on public.price_lists for each row execute function private.guard_commercial_identity();
create trigger commission_identity before update on public.commission_tables for each row execute function private.guard_commercial_identity();
create trigger term_identity before update on public.payment_terms for each row execute function private.guard_commercial_identity();
create trigger assignment_identity before update on public.seller_commission_assignments for each row execute function private.guard_commercial_identity();
create trigger price_version_immutable before insert or update or delete on public.price_list_versions for each row execute function private.guard_commercial_version();
create trigger commission_version_immutable before insert or update or delete on public.commission_versions for each row execute function private.guard_commercial_version();
create trigger price_item_immutable before insert or update or delete on public.price_list_items for each row execute function private.guard_commercial_item();
create trigger commission_item_immutable before insert or update or delete on public.commission_items for each row execute function private.guard_commercial_item();
revoke all on function private.guard_commercial_identity(),private.guard_commercial_version(),private.guard_commercial_item(),private.guard_commission_seller_role() from public,anon,authenticated;

create function public.list_commercial_tables(p_membership_id uuid,p_kind text,p_search text default '',p_status text default 'active',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb; begin
 actor:=private.commercial_actor(p_membership_id); perform private.commercial_page(p_search,p_page,p_page_size);
 if p_kind is null or p_kind not in ('price','commission') or p_status is null or p_status not in ('active','inactive','all') then raise exception 'VALIDATION_ERROR'; end if;
 with source as(select id,name,active,revision from public.price_lists where p_kind='price' and tenant_id=actor.tenant_id
  union all select id,name,active,revision from public.commission_tables where p_kind='commission' and tenant_id=actor.tenant_id),
 visible as materialized(select * from source where (p_status='all' or active=(p_status='active')) and strpos(lower(name),lower(btrim(p_search)))>0),
 paged as(select * from visible order by lower(name),id limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by lower(name),id) from paged p),'[]'::jsonb),'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
 return result;
end $$;
create function public.save_commercial_table(p_membership_id uuid,p_kind text,p_id uuid,p_expected_revision bigint,p_name text,p_active boolean,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; rev bigint; target uuid:=coalesce(p_id,gen_random_uuid()); operation text; constraint_name text; begin
 actor:=private.require_admin(p_membership_id);
 if p_kind is null or p_kind not in ('price','commission') or p_name is null or length(btrim(p_name)) not between 1 and 100 or p_active is null then raise exception 'VALIDATION_ERROR'; end if;
 operation:='save_'||p_kind||'_table';
 if p_id is not null then
  if p_kind='price' then select revision into rev from public.price_lists where tenant_id=actor.tenant_id and id=p_id for update;
  else select revision into rev from public.commission_tables where tenant_id=actor.tenant_id and id=p_id for update; end if;
  if rev is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 elsif p_expected_revision is not null then raise exception 'VALIDATION_ERROR'; end if;
 previous:=private.claim_command(actor.tenant_id,operation,p_idempotency_key,jsonb_build_array(p_kind,p_id,p_expected_revision,p_name,p_active,p_membership_id));
 if previous is not null then return previous; end if;
 if p_id is null then
  if p_kind='price' then insert into public.price_lists(id,tenant_id,name,active) values(target,actor.tenant_id,btrim(p_name),p_active);
  else insert into public.commission_tables(id,tenant_id,name,active) values(target,actor.tenant_id,btrim(p_name),p_active); end if; rev:=1;
 else
  if rev<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  if p_kind='price' then update public.price_lists set name=btrim(p_name),active=p_active,revision=revision+1,updated_at=clock_timestamp() where id=target and tenant_id=actor.tenant_id;
  else update public.commission_tables set name=btrim(p_name),active=p_active,revision=revision+1,updated_at=clock_timestamp() where id=target and tenant_id=actor.tenant_id; end if; rev:=rev+1;
 end if;
 return private.commercial_result(actor,target,rev,p_idempotency_key,operation,p_kind||'.table_saved');
exception when unique_violation then get stacked diagnostics constraint_name=CONSTRAINT_NAME;
 if constraint_name in ('price_lists_name_unique','commission_tables_name_unique') then raise exception 'NAME_IN_USE'; end if; raise;
end $$;

create function public.list_commercial_versions(p_membership_id uuid,p_kind text,p_table_id uuid,p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; parent jsonb; result jsonb; zone text; begin
 actor:=private.commercial_actor(p_membership_id); perform private.commercial_page('',p_page,p_page_size);
 if p_kind='price' then select jsonb_build_object('id',id,'name',name,'active',active,'revision',revision) into parent from public.price_lists where tenant_id=actor.tenant_id and id=p_table_id;
 elsif p_kind='commission' then select jsonb_build_object('id',id,'name',name,'active',active,'revision',revision) into parent from public.commission_tables where tenant_id=actor.tenant_id and id=p_table_id;
 else raise exception 'VALIDATION_ERROR'; end if;
 if parent is null then raise exception 'ACCESS_DENIED'; end if;
 select timezone into zone from public.tenants where id=actor.tenant_id;
 with visible as materialized(
  select id,version,state,valid_from,valid_until,revision,null::text as default_rate from public.price_list_versions where p_kind='price' and tenant_id=actor.tenant_id and price_list_id=p_table_id
  union all select id,version,state,valid_from,valid_until,revision,default_rate::text from public.commission_versions where p_kind='commission' and tenant_id=actor.tenant_id and table_id=p_table_id),
 paged as(select * from visible order by version desc limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('table',parent,'timezone',zone,'items',coalesce((select jsonb_agg(to_jsonb(p) order by version desc) from paged p),'[]'::jsonb),'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
 return result;
end $$;
create function public.save_commercial_version(p_membership_id uuid,p_kind text,p_table_id uuid,p_id uuid,p_expected_revision bigint,p_start_on date,p_end_on date,p_default_rate jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; target uuid:=coalesce(p_id,gen_random_uuid()); rev bigint; number integer; state text; operation text; starts timestamptz; ends timestamptz; rate numeric; begin
 actor:=private.require_admin(p_membership_id); operation:='save_'||p_kind||'_version';
 if p_kind='price' then select next_version into number from public.price_lists where tenant_id=actor.tenant_id and id=p_table_id for update;
  if p_default_rate is not null and p_default_rate<>'null'::jsonb then raise exception 'VALIDATION_ERROR'; end if;
 elsif p_kind='commission' then select next_version into number from public.commission_tables where tenant_id=actor.tenant_id and id=p_table_id for update;
  rate:=private.commercial_decimal(p_default_rate,true); if rate is null then raise exception 'VALIDATION_ERROR'; end if;
 else raise exception 'VALIDATION_ERROR'; end if;
 if number is null then raise exception 'ACCESS_DENIED'; end if;
 if p_id is not null then
  if p_kind='price' then select v.revision,v.state into rev,state from public.price_list_versions v where v.tenant_id=actor.tenant_id and v.price_list_id=p_table_id and v.id=p_id for update;
  else select v.revision,v.state into rev,state from public.commission_versions v where v.tenant_id=actor.tenant_id and v.table_id=p_table_id and v.id=p_id for update; end if;
  if rev is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 elsif p_expected_revision is not null then raise exception 'VALIDATION_ERROR'; end if;
 starts:=private.commercial_day(actor.tenant_id,p_start_on); ends:=private.commercial_day(actor.tenant_id,p_end_on);
 if starts is not null and ends is not null and ends<=starts then raise exception 'INVALID_WINDOW'; end if;
 previous:=private.claim_command(actor.tenant_id,operation,p_idempotency_key,jsonb_build_array(p_membership_id,p_kind,p_table_id,p_id,p_expected_revision,p_start_on,p_end_on,p_default_rate));
 if previous is not null then return previous; end if;
 if p_id is null then
  if p_kind='price' then
   insert into public.price_list_versions(id,tenant_id,price_list_id,version,valid_from,valid_until) values(target,actor.tenant_id,p_table_id,number,starts,ends);
   update public.price_lists set next_version=next_version+1,revision=revision+1,updated_at=clock_timestamp() where tenant_id=actor.tenant_id and id=p_table_id;
  else
   insert into public.commission_versions(id,tenant_id,table_id,version,valid_from,valid_until,default_rate) values(target,actor.tenant_id,p_table_id,number,starts,ends,rate);
   update public.commission_tables set next_version=next_version+1,revision=revision+1,updated_at=clock_timestamp() where tenant_id=actor.tenant_id and id=p_table_id;
  end if; rev:=1;
 else
  if state<>'draft' then raise exception 'PUBLISHED_IMMUTABLE'; end if;
  if rev<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  if p_kind='price' then update public.price_list_versions set valid_from=starts,valid_until=ends,revision=revision+1 where tenant_id=actor.tenant_id and id=target;
  else update public.commission_versions set valid_from=starts,valid_until=ends,default_rate=rate,revision=revision+1 where tenant_id=actor.tenant_id and id=target; end if; rev:=rev+1;
 end if;
 return private.commercial_result(actor,target,rev,p_idempotency_key,operation,p_kind||'.version_saved');
end $$;

create function public.get_commercial_version(p_membership_id uuid,p_kind text,p_version_id uuid,p_search text default '',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; header jsonb; zone text; result jsonb; begin
 actor:=private.commercial_actor(p_membership_id); perform private.commercial_page(p_search,p_page,p_page_size);
 select timezone into zone from public.tenants where id=actor.tenant_id;
 if p_kind='price' then
  select jsonb_build_object('id',v.id,'table_id',t.id,'table_name',t.name,'table_active',t.active,'version',v.version,'state',v.state,'revision',v.revision,
   'valid_from',v.valid_from,'valid_until',v.valid_until,'start_on',(v.valid_from at time zone zone)::date,'end_on',(v.valid_until at time zone zone)::date,'default_rate',null)
  into header from public.price_list_versions v join public.price_lists t on t.tenant_id=v.tenant_id and t.id=v.price_list_id where v.tenant_id=actor.tenant_id and v.id=p_version_id;
 elsif p_kind='commission' then
  select jsonb_build_object('id',v.id,'table_id',t.id,'table_name',t.name,'table_active',t.active,'version',v.version,'state',v.state,'revision',v.revision,
   'valid_from',v.valid_from,'valid_until',v.valid_until,'start_on',(v.valid_from at time zone zone)::date,'end_on',(v.valid_until at time zone zone)::date,'default_rate',v.default_rate::text)
  into header from public.commission_versions v join public.commission_tables t on t.tenant_id=v.tenant_id and t.id=v.table_id where v.tenant_id=actor.tenant_id and v.id=p_version_id;
 else raise exception 'VALIDATION_ERROR'; end if;
 if header is null then raise exception 'ACCESS_DENIED'; end if;
 with source as(select product_id,unit_price::text as value from public.price_list_items where p_kind='price' and tenant_id=actor.tenant_id and version_id=p_version_id
  union all select product_id,rate::text from public.commission_items where p_kind='commission' and tenant_id=actor.tenant_id and version_id=p_version_id),
 visible as materialized(select s.product_id,p.sku,p.name,p.active,s.value from source s join public.products p on p.tenant_id=actor.tenant_id and p.id=s.product_id where strpos(lower(p.sku),lower(btrim(p_search)))>0 or strpos(lower(p.name),lower(btrim(p_search)))>0),
 paged as(select * from visible order by lower(name),product_id limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('version',header,'timezone',zone,'items',coalesce((select jsonb_agg(to_jsonb(p) order by lower(name),product_id) from paged p),'[]'::jsonb),'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result;
 return result;
end $$;

create function public.set_commercial_item(p_membership_id uuid,p_kind text,p_version_id uuid,p_expected_revision bigint,p_product_id uuid,p_value jsonb,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; rev bigint; state text; amount numeric; removing boolean; operation text; begin
 actor:=private.require_admin(p_membership_id); operation:='set_'||p_kind||'_item';
 if p_kind='price' then select v.revision,v.state into rev,state from public.price_list_versions v where v.tenant_id=actor.tenant_id and v.id=p_version_id for update;
 elsif p_kind='commission' then select v.revision,v.state into rev,state from public.commission_versions v where v.tenant_id=actor.tenant_id and v.id=p_version_id for update;
 else raise exception 'VALIDATION_ERROR'; end if;
 if rev is null then raise exception 'ACCESS_DENIED'; end if;
 if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 removing:=p_value is null or p_value='null'::jsonb;
 if not removing then amount:=private.commercial_decimal(p_value,p_kind='commission'); if amount is null then raise exception 'VALIDATION_ERROR'; end if; end if;
 previous:=private.claim_command(actor.tenant_id,operation,p_idempotency_key,jsonb_build_array(p_membership_id,p_kind,p_version_id,p_expected_revision,p_product_id,p_value));
 if previous is not null then return previous; end if;
 if state<>'draft' then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if rev<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
 if not exists(select 1 from public.products p where p.tenant_id=actor.tenant_id and p.id=p_product_id and (removing or p.active)) then raise exception 'PRODUCT_UNAVAILABLE'; end if;
 if p_kind='price' then
  if removing then delete from public.price_list_items where tenant_id=actor.tenant_id and version_id=p_version_id and product_id=p_product_id;
  else insert into public.price_list_items(tenant_id,version_id,product_id,unit_price) values(actor.tenant_id,p_version_id,p_product_id,amount) on conflict(tenant_id,version_id,product_id) do update set unit_price=excluded.unit_price; end if;
  update public.price_list_versions set revision=revision+1 where tenant_id=actor.tenant_id and id=p_version_id;
 else
  if removing then delete from public.commission_items where tenant_id=actor.tenant_id and version_id=p_version_id and product_id=p_product_id;
  else insert into public.commission_items(tenant_id,version_id,product_id,rate) values(actor.tenant_id,p_version_id,p_product_id,amount) on conflict(tenant_id,version_id,product_id) do update set rate=excluded.rate; end if;
  update public.commission_versions set revision=revision+1 where tenant_id=actor.tenant_id and id=p_version_id;
 end if;
 return private.commercial_result(actor,p_version_id,rev+1,p_idempotency_key,operation,p_kind||'.item_changed');
end $$;

create function public.publish_commercial_version(p_membership_id uuid,p_kind text,p_version_id uuid,p_expected_revision bigint,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; rev bigint; state text; starts timestamptz; ends timestamptz; enabled boolean; operation text; begin
 actor:=private.require_admin(p_membership_id); operation:='publish_'||p_kind||'_version';
 if p_kind='price' then select v.revision,v.state,v.valid_from,v.valid_until,t.active into rev,state,starts,ends,enabled from public.price_list_versions v join public.price_lists t on t.tenant_id=v.tenant_id and t.id=v.price_list_id where v.tenant_id=actor.tenant_id and v.id=p_version_id for update of v;
 elsif p_kind='commission' then select v.revision,v.state,v.valid_from,v.valid_until,t.active into rev,state,starts,ends,enabled from public.commission_versions v join public.commission_tables t on t.tenant_id=v.tenant_id and t.id=v.table_id where v.tenant_id=actor.tenant_id and v.id=p_version_id for update of v;
 else raise exception 'VALIDATION_ERROR'; end if;
 if rev is null then raise exception 'ACCESS_DENIED'; end if;
 if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 previous:=private.claim_command(actor.tenant_id,operation,p_idempotency_key,jsonb_build_array(p_membership_id,p_kind,p_version_id,p_expected_revision));
 if previous is not null then return previous; end if;
 if state<>'draft' then raise exception 'PUBLISHED_IMMUTABLE'; end if;
 if rev<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
 if not enabled then raise exception 'TABLE_UNAVAILABLE'; end if;
 starts:=coalesce(starts,clock_timestamp()); if ends is not null and ends<=starts then raise exception 'INVALID_WINDOW'; end if;
 if p_kind='price' then update public.price_list_versions set state='published',valid_from=starts,published_at=clock_timestamp(),revision=revision+1 where tenant_id=actor.tenant_id and id=p_version_id;
 else update public.commission_versions set state='published',valid_from=starts,published_at=clock_timestamp(),revision=revision+1 where tenant_id=actor.tenant_id and id=p_version_id; end if;
 return private.commercial_result(actor,p_version_id,rev+1,p_idempotency_key,operation,p_kind||'.version_published');
exception when exclusion_violation then raise exception 'PERIOD_OVERLAP';
end $$;

create function public.list_payment_terms(p_membership_id uuid,p_search text default '',p_status text default 'active',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb; begin
 actor:=private.commercial_actor(p_membership_id); perform private.commercial_page(p_search,p_page,p_page_size);
 if p_status is null or p_status not in ('active','inactive','all') then raise exception 'VALIDATION_ERROR'; end if;
 with visible as materialized(select id,name,installments,first_due_days,interval_days,active,revision from public.payment_terms where tenant_id=actor.tenant_id and (p_status='all' or active=(p_status='active')) and strpos(lower(name),lower(btrim(p_search)))>0),
 paged as(select * from visible order by lower(name),id limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by lower(name),id) from paged p),'[]'::jsonb),'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result; return result;
end $$;
create function public.save_payment_term(p_membership_id uuid,p_id uuid,p_expected_revision bigint,p_name text,p_installments integer,p_first_due_days integer,p_interval_days integer,p_active boolean,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; rev bigint; target uuid:=coalesce(p_id,gen_random_uuid()); constraint_name text; begin
 actor:=private.require_admin(p_membership_id);
 if p_name is null or length(btrim(p_name)) not between 1 and 100 or p_installments is null or p_installments not between 1 and 12 or p_first_due_days is null or p_first_due_days not between 0 and 365 or p_interval_days is null or p_active is null or not ((p_installments=1 and p_interval_days=0) or (p_installments>1 and p_interval_days between 1 and 365)) then raise exception 'VALIDATION_ERROR'; end if;
 if p_id is not null then
  select revision into rev from public.payment_terms where tenant_id=actor.tenant_id and id=p_id for update;
  if rev is null then raise exception 'ACCESS_DENIED'; end if;
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 elsif p_expected_revision is not null then raise exception 'VALIDATION_ERROR'; end if;
 previous:=private.claim_command(actor.tenant_id,'save_payment_term',p_idempotency_key,jsonb_build_array(p_membership_id,p_id,p_expected_revision,p_name,p_installments,p_first_due_days,p_interval_days,p_active));
 if previous is not null then return previous; end if;
 if p_id is null then insert into public.payment_terms(id,tenant_id,name,installments,first_due_days,interval_days,active) values(target,actor.tenant_id,btrim(p_name),p_installments,p_first_due_days,p_interval_days,p_active); rev:=1;
 else
  if rev<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
  update public.payment_terms set name=btrim(p_name),installments=p_installments,first_due_days=p_first_due_days,interval_days=p_interval_days,active=p_active,revision=revision+1,updated_at=clock_timestamp() where tenant_id=actor.tenant_id and id=target; rev:=rev+1;
 end if;
 return private.commercial_result(actor,target,rev,p_idempotency_key,'save_payment_term','payment_term.saved');
exception when unique_violation then get stacked diagnostics constraint_name=CONSTRAINT_NAME;
 if constraint_name='payment_terms_name_unique' then raise exception 'NAME_IN_USE'; end if; raise;
end $$;
create function public.get_customer_commercial(p_membership_id uuid,p_customer_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; result jsonb; begin
 actor:=private.commercial_actor(p_membership_id);
 select jsonb_build_object('id',c.id,'name',c.name,'status',c.status,'revision',c.revision,
  'price_list_id',c.price_list_id,'price_list_name',p.name,'price_list_active',p.active,
  'payment_term_id',c.payment_term_id,'payment_term_name',t.name,'payment_term_active',t.active)
 into result from public.customers c left join public.price_lists p on p.tenant_id=c.tenant_id and p.id=c.price_list_id
 left join public.payment_terms t on t.tenant_id=c.tenant_id and t.id=c.payment_term_id where c.tenant_id=actor.tenant_id and c.id=p_customer_id;
 if result is null then raise exception 'ACCESS_DENIED'; end if; return result;
end $$;
create function public.set_customer_commercial(p_membership_id uuid,p_customer_id uuid,p_expected_revision bigint,p_price_list_id uuid,p_payment_term_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; customer public.customers; previous jsonb; begin
 actor:=private.require_admin(p_membership_id);
 select c.* into customer from public.customers c where c.tenant_id=actor.tenant_id and c.id=p_customer_id for update;
 if customer.id is null then raise exception 'ACCESS_DENIED'; end if;
 if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 previous:=private.claim_command(actor.tenant_id,'set_customer_commercial',p_idempotency_key,jsonb_build_array(p_membership_id,p_customer_id,p_expected_revision,p_price_list_id,p_payment_term_id));
 if previous is not null then return previous; end if;
 if customer.status<>'active' then raise exception 'CUSTOMER_UNAVAILABLE'; end if;
 if customer.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
 if p_price_list_id is not null and p_price_list_id is distinct from customer.price_list_id and not exists(select 1 from public.price_lists where tenant_id=actor.tenant_id and id=p_price_list_id and active) then raise exception 'TABLE_UNAVAILABLE'; end if;
 if p_payment_term_id is not null and p_payment_term_id is distinct from customer.payment_term_id and not exists(select 1 from public.payment_terms where tenant_id=actor.tenant_id and id=p_payment_term_id and active) then raise exception 'TERM_UNAVAILABLE'; end if;
 update public.customers set price_list_id=p_price_list_id,payment_term_id=p_payment_term_id,revision=revision+1,updated_at=clock_timestamp() where tenant_id=actor.tenant_id and id=customer.id;
 return private.commercial_result(actor,customer.id,customer.revision+1,p_idempotency_key,'set_customer_commercial','customer.commercial_changed');
end $$;

create function public.list_seller_commission_assignments(p_membership_id uuid,p_search text default '',p_page integer default 0,p_page_size integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; zone text; result jsonb; begin
 actor:=private.commercial_actor(p_membership_id); perform private.commercial_page(p_search,p_page,p_page_size);
 select timezone into zone from public.tenants where id=actor.tenant_id;
 with visible as materialized(select a.id,a.seller_membership_id,coalesce(p.display_name,'Vendedor indisponível') as seller_name,
  private.customer_seller_valid(a.tenant_id,a.seller_membership_id) as seller_active,
  a.table_id,t.name as table_name,t.active as table_active,a.valid_from,a.valid_until,a.cancelled_at,a.revision,
  case when a.cancelled_at is not null then 'cancelled' when a.valid_from>now() then 'scheduled' when a.valid_until<=now() then 'ended' else 'current' end as state
  from public.seller_commission_assignments a join public.commission_tables t on t.tenant_id=a.tenant_id and t.id=a.table_id
  join public.memberships m on m.tenant_id=a.tenant_id and m.id=a.seller_membership_id
  left join public.profiles p on p.user_id=m.user_id
  where a.tenant_id=actor.tenant_id and (strpos(lower(coalesce(p.display_name,'')),lower(btrim(p_search)))>0 or strpos(lower(t.name),lower(btrim(p_search)))>0)),
 paged as(select * from visible order by valid_from desc,id limit p_page_size offset p_page*p_page_size)
 select jsonb_build_object('timezone',zone,'items',coalesce((select jsonb_agg(to_jsonb(p) order by valid_from desc,id) from paged p),'[]'::jsonb),'total',(select count(*) from visible),'page',p_page,'page_size',p_page_size) into result; return result;
end $$;
create function public.assign_seller_commission(p_membership_id uuid,p_seller_membership_id uuid,p_table_id uuid,p_start_on date,p_end_on date,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; previous jsonb; target uuid:=gen_random_uuid(); starts timestamptz; ends timestamptz; begin
 actor:=private.require_admin(p_membership_id);
 previous:=private.claim_command(actor.tenant_id,'assign_seller_commission',p_idempotency_key,jsonb_build_array(p_membership_id,p_seller_membership_id,p_table_id,p_start_on,p_end_on));
 if previous is not null then return previous; end if;
 if p_seller_membership_id is null or not private.customer_seller_valid(actor.tenant_id,p_seller_membership_id) then raise exception 'SELLER_UNAVAILABLE'; end if;
 if not exists(select 1 from public.commission_tables where tenant_id=actor.tenant_id and id=p_table_id and active) then raise exception 'TABLE_UNAVAILABLE'; end if;
 starts:=coalesce(private.commercial_day(actor.tenant_id,p_start_on),clock_timestamp()); ends:=private.commercial_day(actor.tenant_id,p_end_on);
 if ends is not null and ends<=starts then raise exception 'INVALID_WINDOW'; end if;
 insert into public.seller_commission_assignments(id,tenant_id,seller_membership_id,table_id,valid_from,valid_until) values(target,actor.tenant_id,p_seller_membership_id,p_table_id,starts,ends);
 return private.commercial_result(actor,target,1,p_idempotency_key,'assign_seller_commission','seller.commission_assigned');
exception when exclusion_violation then raise exception 'PERIOD_OVERLAP';
end $$;
create function public.end_seller_commission_assignment(p_membership_id uuid,p_id uuid,p_expected_revision bigint,p_end_on date,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=on
as $$ declare actor public.memberships; assignment public.seller_commission_assignments; previous jsonb; ends timestamptz; db_now timestamptz; begin
 actor:=private.require_admin(p_membership_id);
 select a.* into assignment from public.seller_commission_assignments a where a.tenant_id=actor.tenant_id and a.id=p_id for update;
 if assignment.id is null then raise exception 'ACCESS_DENIED'; end if;
 if p_expected_revision is null or p_expected_revision<1 then raise exception 'VALIDATION_ERROR'; end if;
 previous:=private.claim_command(actor.tenant_id,'end_seller_commission_assignment',p_idempotency_key,jsonb_build_array(p_membership_id,p_id,p_expected_revision,p_end_on));
 if previous is not null then return previous; end if;
 db_now:=clock_timestamp();
 if assignment.revision<>p_expected_revision then raise exception 'STALE_VERSION'; end if;
 if assignment.cancelled_at is not null or assignment.valid_until<=db_now then raise exception 'INVALID_STATE'; end if;
 if p_end_on is null and assignment.valid_from>db_now then
  update public.seller_commission_assignments set cancelled_at=db_now,revision=revision+1,updated_at=db_now where tenant_id=actor.tenant_id and id=p_id;
 else
  ends:=coalesce(private.commercial_day(actor.tenant_id,p_end_on),db_now);
  if ends<db_now or ends<=assignment.valid_from or (assignment.valid_until is not null and ends>assignment.valid_until) then raise exception 'INVALID_WINDOW'; end if;
  update public.seller_commission_assignments set valid_until=ends,revision=revision+1,updated_at=db_now where tenant_id=actor.tenant_id and id=p_id;
 end if;
 return private.commercial_result(actor,p_id,assignment.revision+1,p_idempotency_key,'end_seller_commission_assignment','seller.commission_ended');
end $$;

do $migration$ declare signature regprocedure; begin
 foreach signature in array array[
  'private.commercial_actor(uuid)'::regprocedure,'private.commercial_decimal(jsonb,boolean)'::regprocedure,
  'private.commercial_day(uuid,date)'::regprocedure,'private.commercial_page(text,integer,integer)'::regprocedure,
  'private.commercial_result(public.memberships,uuid,bigint,uuid,text,text)'::regprocedure,
  'public.list_commercial_tables(uuid,text,text,text,integer,integer)'::regprocedure,
  'public.save_commercial_table(uuid,text,uuid,bigint,text,boolean,uuid)'::regprocedure,
  'public.list_commercial_versions(uuid,text,uuid,integer,integer)'::regprocedure,
  'public.save_commercial_version(uuid,text,uuid,uuid,bigint,date,date,jsonb,uuid)'::regprocedure,
  'public.get_commercial_version(uuid,text,uuid,text,integer,integer)'::regprocedure,
  'public.set_commercial_item(uuid,text,uuid,bigint,uuid,jsonb,uuid)'::regprocedure,
  'public.publish_commercial_version(uuid,text,uuid,bigint,uuid)'::regprocedure,
  'public.list_payment_terms(uuid,text,text,integer,integer)'::regprocedure,
  'public.save_payment_term(uuid,uuid,bigint,text,integer,integer,integer,boolean,uuid)'::regprocedure,
  'public.get_customer_commercial(uuid,uuid)'::regprocedure,
  'public.set_customer_commercial(uuid,uuid,bigint,uuid,uuid,uuid)'::regprocedure,
  'public.list_seller_commission_assignments(uuid,text,integer,integer)'::regprocedure,
  'public.assign_seller_commission(uuid,uuid,uuid,date,date,uuid)'::regprocedure,
  'public.end_seller_commission_assignment(uuid,uuid,bigint,date,uuid)'::regprocedure
 ] loop
  execute format('alter function %s owner to atacado_executor',signature);
  execute format('revoke all on function %s from public,anon,authenticated',signature);
  if (select pronamespace='public'::regnamespace from pg_proc where oid=signature::oid) then
   execute format('grant execute on function %s to authenticated',signature);
  end if;
 end loop;
end $migration$;
revoke create on schema private,public from atacado_executor;
commit;
