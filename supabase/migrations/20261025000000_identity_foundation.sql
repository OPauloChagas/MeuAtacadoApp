begin;

do $roles$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'atacado_executor') then
    create role atacado_executor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'atacado_membership_reader') then
    create role atacado_membership_reader nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
  if exists (select 1 from pg_catalog.pg_roles where rolname in ('atacado_executor', 'atacado_membership_reader')
    and (rolcanlogin or rolinherit or rolsuper or rolcreatedb or rolcreaterole or rolbypassrls)) then
    raise exception 'UNSAFE_EXISTING_RPC_ROLE';
  end if;
end;
$roles$;
grant atacado_executor, atacado_membership_reader to postgres;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) between 1 and 200),
  trade_name text not null check (length(btrim(trade_name)) between 1 and 160),
  document text not null unique check (length(btrim(document)) between 1 and 32),
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'active' check (status in ('active', 'inactive')),
  contact jsonb not null default '{}' check (jsonb_typeof(contact) = 'object' and octet_length(contact::text) <= 4096),
  address jsonb not null default '{}' check (jsonb_typeof(address) = 'object' and octet_length(address::text) <= 4096),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  document text not null check (length(btrim(document)) between 1 and 32),
  name text not null check (length(btrim(name)) between 1 and 200),
  seller_membership_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, document)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  role text not null check (role in ('admin', 'seller', 'buyer')),
  customer_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id) on delete restrict,
  check ((role = 'buyer' and customer_id is not null) or (role <> 'buyer' and customer_id is null))
);
create unique index memberships_internal_unique on public.memberships(tenant_id, user_id, role) where role <> 'buyer';
create unique index memberships_buyer_unique on public.memberships(tenant_id, user_id, customer_id) where role = 'buyer';
create index memberships_actor_lookup on public.memberships(user_id, status, tenant_id);
create index memberships_customer_fk on public.memberships(tenant_id, customer_id);
alter table public.customers add constraint customers_seller_fk
  foreign key (tenant_id, seller_membership_id) references public.memberships(tenant_id, id) on delete restrict;
create index customers_seller_lookup on public.customers(tenant_id, seller_membership_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null check (length(email) between 3 and 254 and email = lower(btrim(email))),
  role text not null check (role in ('admin', 'seller', 'buyer')),
  customer_id uuid,
  requested_by_membership_id uuid not null,
  state text not null default 'pending' check (state in ('pending', 'sent', 'accepted', 'failed')),
  provider_reference text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id) on delete restrict,
  foreign key (tenant_id, requested_by_membership_id) references public.memberships(tenant_id, id) on delete restrict,
  check ((role = 'buyer' and customer_id is not null) or (role <> 'buyer' and customer_id is null))
);
create index invitations_customer_fk on public.invitations(tenant_id, customer_id);
create index invitations_requester_fk on public.invitations(tenant_id, requested_by_membership_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  actor_membership_id uuid,
  actor_kind text not null check (actor_kind in ('user', 'platform')),
  action text not null check (length(action) between 1 and 100),
  entity_type text not null,
  entity_id uuid not null,
  safe_metadata jsonb not null default '{}' check (jsonb_typeof(safe_metadata) = 'object' and octet_length(safe_metadata::text) <= 4096),
  request_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, actor_membership_id) references public.memberships(tenant_id, id) on delete restrict,
  check ((actor_kind = 'user' and actor_user_id is not null and actor_membership_id is not null)
    or (actor_kind = 'platform' and actor_user_id is null and actor_membership_id is null))
);
create index audit_events_tenant_time on public.audit_events(tenant_id, occurred_at desc);
create index audit_events_membership_fk on public.audit_events(tenant_id, actor_membership_id);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null,
  key uuid not null,
  payload_hash text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, actor_user_id, operation, key)
);

-- Platform bootstrap precedes tenant creation, so its request is global/private.
create table private.provision_requests (
  key uuid primary key,
  payload_hash text not null,
  response jsonb,
  created_at timestamptz not null default now()
);
revoke all on private.provision_requests from public, anon, authenticated, atacado_executor, atacado_membership_reader;

-- Every business table remains owned by the migration operator, not RPC roles.
do $migration$
declare relation text;
begin
  foreach relation in array array['tenants', 'profiles', 'customers', 'memberships', 'invitations', 'audit_events', 'idempotency_keys'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('alter table public.%I force row level security', relation);
    execute format('revoke all on public.%I from public, anon, authenticated', relation);
  end loop;
end;
$migration$;
revoke create on schema public from public, anon, authenticated;
grant usage on schema public, private to atacado_executor, atacado_membership_reader;
-- CREATE is needed only while transferring function ownership, then revoked.
grant create on schema private to atacado_executor, atacado_membership_reader;
grant create on schema public to atacado_executor;
-- Supabase owns auth; postgres cannot delegate its schema USAGE. This sealed
-- bridge only reads auth.uid(), never tables. Public RPCs still use RLS roles.
create function private.request_user_id()
returns uuid language sql stable security definer set search_path = ''
as $function$ select auth.uid(); $function$;
revoke all on function private.request_user_id() from public, anon, authenticated;
grant execute on function private.request_user_id() to authenticated, atacado_executor, atacado_membership_reader;

-- Reader policies are non-recursive and only back sealed boolean helpers.
grant select (id, status) on public.tenants to atacado_membership_reader;
grant select (user_id, status) on public.profiles to atacado_membership_reader;
grant select (id, tenant_id, user_id, role, customer_id, status) on public.memberships to atacado_membership_reader;
grant select (id, tenant_id, status, seller_membership_id) on public.customers to atacado_membership_reader;
create policy reader_tenants on public.tenants for select to atacado_membership_reader using (true);
create policy reader_profiles on public.profiles for select to atacado_membership_reader using (true);
create policy reader_memberships on public.memberships for select to atacado_membership_reader using (true);
create policy reader_customers on public.customers for select to atacado_membership_reader using (true);

create function private.active_membership(p_membership_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select exists (
    select 1 from public.memberships m
    join public.profiles p on p.user_id = m.user_id and p.status = 'active'
    join public.tenants t on t.id = m.tenant_id and t.status = 'active'
    left join public.customers c on c.tenant_id = m.tenant_id and c.id = m.customer_id
    where m.id = p_membership_id and m.user_id = private.request_user_id() and m.status = 'active'
      and (m.role <> 'buyer' or c.status = 'active')
  );
$function$;
create function private.active_member(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select exists (
    select 1 from public.memberships m
    join public.profiles p on p.user_id = m.user_id and p.status = 'active'
    join public.tenants t on t.id = m.tenant_id and t.status = 'active'
    left join public.customers c on c.tenant_id = m.tenant_id and c.id = m.customer_id
    where m.tenant_id = p_tenant_id and m.user_id = private.request_user_id() and m.status = 'active'
      and (m.role <> 'buyer' or c.status = 'active')
  );
$function$;
create function private.active_admin(p_tenant_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select exists (
    select 1 from public.memberships m
    join public.profiles p on p.user_id = m.user_id and p.status = 'active'
    join public.tenants t on t.id = m.tenant_id and t.status = 'active'
    where m.tenant_id = p_tenant_id and m.user_id = private.request_user_id()
      and m.role = 'admin' and m.status = 'active'
  );
$function$;
create function private.owns_membership(p_tenant_id uuid, p_membership_id uuid default null)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select exists (select 1 from public.memberships m where m.tenant_id = p_tenant_id
    and m.user_id = private.request_user_id() and (p_membership_id is null or m.id = p_membership_id));
$function$;
create function private.other_active_admin(p_tenant_id uuid, p_target_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select private.active_admin(p_tenant_id) and exists (
    select 1 from public.memberships m join public.profiles p on p.user_id = m.user_id and p.status = 'active'
    where m.tenant_id = p_tenant_id and m.id <> p_target_id and m.role = 'admin' and m.status = 'active'
  );
$function$;
create function private.readable_customer(p_tenant_id uuid, p_customer_id uuid, p_seller_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $function$
  select exists (
    select 1 from public.memberships m
    join public.profiles p on p.user_id = m.user_id and p.status = 'active'
    join public.tenants t on t.id = m.tenant_id and t.status = 'active'
    left join public.customers c on c.tenant_id = m.tenant_id and c.id = m.customer_id
    where m.tenant_id = p_tenant_id and m.user_id = private.request_user_id() and m.status = 'active'
      and (m.role = 'admin' or (m.role = 'seller' and m.id = p_seller_id)
        or (m.role = 'buyer' and m.customer_id = p_customer_id and c.status = 'active'))
  );
$function$;

do $migration$
declare signature regprocedure;
begin
  foreach signature in array array[
    'private.active_membership(uuid)'::regprocedure, 'private.active_member(uuid)'::regprocedure,
    'private.active_admin(uuid)'::regprocedure, 'private.owns_membership(uuid,uuid)'::regprocedure,
    'private.other_active_admin(uuid,uuid)'::regprocedure,
    'private.readable_customer(uuid,uuid,uuid)'::regprocedure
  ] loop
    execute format('alter function %s owner to atacado_membership_reader', signature);
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to authenticated, atacado_executor', signature);
  end loop;
end;
$migration$;

grant select on public.profiles, public.memberships, public.customers to authenticated;
grant select on public.tenants, public.profiles, public.memberships, public.customers to atacado_executor;
grant update (legal_name, trade_name, contact, address, revision, updated_at) on public.tenants to atacado_executor;
grant update (status, revision, updated_at) on public.memberships to atacado_executor;
grant select, insert, update on public.idempotency_keys to atacado_executor;
grant insert on public.audit_events to atacado_executor;
grant usage on schema extensions to atacado_executor;
grant execute on function extensions.digest(text, text) to atacado_executor;

create policy profiles_own on public.profiles for select to authenticated, atacado_executor
  using (user_id = (select private.request_user_id()) and status = 'active');
create policy memberships_read on public.memberships for select to authenticated, atacado_executor
  using (private.active_admin(tenant_id) or (user_id = (select private.request_user_id()) and private.active_membership(id)));
create policy customers_read on public.customers for select to authenticated, atacado_executor
  using (private.readable_customer(tenant_id, id, seller_membership_id));
create policy tenants_read on public.tenants for select to atacado_executor
  using (private.active_member(id));
create policy tenants_update on public.tenants for update to atacado_executor
  using (private.active_admin(id)) with check (private.active_admin(id));
create policy memberships_update on public.memberships for update to atacado_executor
  using (private.active_admin(tenant_id)) with check (private.owns_membership(tenant_id));
-- Internal writes can finish their audit/idempotent response after self-revocation.
-- Authenticated has no DML; every public RPC authorizes before replay as well.
create policy idempotency_internal on public.idempotency_keys for all to atacado_executor
  using (actor_user_id = (select private.request_user_id()) and private.owns_membership(tenant_id))
  with check (actor_user_id = (select private.request_user_id()) and private.owns_membership(tenant_id));
create policy audit_internal on public.audit_events for insert to atacado_executor
  with check (actor_kind = 'user' and actor_user_id = (select private.request_user_id())
    and private.owns_membership(tenant_id, actor_membership_id));

create function private.guard_identity_references()
returns trigger language plpgsql set search_path = ''
as $function$
begin
  if tg_table_name = 'customers' then
    if new.tenant_id is distinct from old.tenant_id and tg_op = 'UPDATE' then
      raise exception using message = 'TENANT_IMMUTABLE', errcode = '23514';
    end if;
    if new.seller_membership_id is not null and not exists (
      select 1 from public.memberships m where m.tenant_id = new.tenant_id
        and m.id = new.seller_membership_id and m.role = 'seller'
    ) then raise exception using message = 'SELLER_REQUIRED', errcode = '23514'; end if;
  elsif tg_table_name = 'memberships' then
    if new.tenant_id is distinct from old.tenant_id or new.user_id is distinct from old.user_id then
      raise exception using message = 'MEMBERSHIP_IDENTITY_IMMUTABLE', errcode = '23514';
    end if;
    if new.role is distinct from old.role and exists (
      select 1 from public.customers c where c.tenant_id = old.tenant_id and c.seller_membership_id = old.id
    ) then raise exception using message = 'REFERENCED_SELLER_IMMUTABLE', errcode = '23514'; end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.guard_identity_references() from public, anon, authenticated;
create trigger customers_identity_guard before insert or update on public.customers
  for each row execute function private.guard_identity_references();
create trigger memberships_identity_guard before update on public.memberships
  for each row execute function private.guard_identity_references();

create function private.require_admin(p_membership_id uuid)
returns public.memberships language plpgsql set search_path = '' set row_security = on
as $function$
declare actor public.memberships;
begin
  select m.* into actor from public.memberships m where m.id = p_membership_id
    and m.user_id = private.request_user_id() and m.role = 'admin' and m.status = 'active';
  if actor.id is null then raise exception using message = 'ACCESS_DENIED', errcode = 'P0001'; end if;
  perform 1 from public.tenants t where t.id = actor.tenant_id and t.status = 'active' for update;
  if not found then raise exception using message = 'ACCESS_DENIED', errcode = 'P0001'; end if;
  -- A waiting command must revalidate after the tenant lock is acquired.
  if not private.active_admin(actor.tenant_id) or not private.active_membership(p_membership_id) then
    raise exception using message = 'ACCESS_DENIED', errcode = 'P0001';
  end if;
  return actor;
end;
$function$;
create function private.claim_command(p_tenant_id uuid, p_operation text, p_key uuid, p_payload jsonb)
returns jsonb language plpgsql set search_path = '' set row_security = on
as $function$
declare request public.idempotency_keys; fingerprint text;
begin
  if p_key is null then raise exception using message = 'VALIDATION_ERROR', errcode = 'P0001'; end if;
  fingerprint := pg_catalog.encode(extensions.digest(p_payload::text, 'sha256'), 'hex');
  insert into public.idempotency_keys(tenant_id, actor_user_id, operation, key, payload_hash)
    values (p_tenant_id, private.request_user_id(), p_operation, p_key, fingerprint)
    on conflict (tenant_id, actor_user_id, operation, key) do nothing;
  select i.* into strict request from public.idempotency_keys i where i.tenant_id = p_tenant_id
    and i.actor_user_id = private.request_user_id() and i.operation = p_operation and i.key = p_key for update;
  if request.payload_hash <> fingerprint then
    raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001';
  end if;
  return request.response;
end;
$function$;
create function private.finish_command(p_tenant_id uuid, p_operation text, p_key uuid, p_response jsonb)
returns void language sql set search_path = '' set row_security = on
as $function$
  update public.idempotency_keys set response = p_response where tenant_id = p_tenant_id
    and actor_user_id = private.request_user_id() and operation = p_operation and key = p_key;
$function$;

create function public.get_my_contexts()
returns table(membership_id uuid, tenant_id uuid, company_name text, role text, customer_id uuid, customer_name text)
language sql stable security definer set search_path = '' set row_security = on
as $function$
  select m.id, m.tenant_id, t.trade_name, m.role, m.customer_id, c.name
  from public.memberships m join public.tenants t on t.id = m.tenant_id
  left join public.customers c on c.tenant_id = m.tenant_id and c.id = m.customer_id
  where m.user_id = private.request_user_id() and private.active_membership(m.id)
  order by t.trade_name, m.role, m.id;
$function$;
create function public.get_current_context(p_membership_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set row_security = on
as $function$
declare result jsonb;
begin
  select to_jsonb(c) into result from public.get_my_contexts() c where c.membership_id = p_membership_id;
  if result is null then raise exception using message = 'ACCESS_DENIED', errcode = 'P0001'; end if;
  return result;
end;
$function$;
create function public.get_tenant_admin(p_membership_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set row_security = on
as $function$
declare result jsonb;
begin
  select jsonb_build_object('id', t.id, 'legal_name', t.legal_name, 'trade_name', t.trade_name,
    'document', t.document, 'timezone', t.timezone, 'contact', t.contact, 'address', t.address, 'revision', t.revision)
  into result from public.memberships m join public.tenants t on t.id = m.tenant_id
  where m.id = p_membership_id and m.user_id = private.request_user_id() and m.role = 'admin' and private.active_membership(m.id);
  if result is null then raise exception using message = 'ACCESS_DENIED', errcode = 'P0001'; end if;
  return result;
end;
$function$;
create function public.update_tenant(p_membership_id uuid, p_expected_revision bigint, p_legal_name text,
  p_trade_name text, p_contact jsonb, p_address jsonb, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $function$
declare actor public.memberships; previous jsonb; result jsonb; event_id uuid := gen_random_uuid(); current_revision bigint;
begin
  actor := private.require_admin(p_membership_id);
  if p_expected_revision is null or p_expected_revision < 1 or p_legal_name is null or p_trade_name is null
    or length(btrim(p_legal_name)) not between 1 and 200 or length(btrim(p_trade_name)) not between 1 and 160
    or p_contact is null or p_address is null or jsonb_typeof(p_contact) <> 'object' or jsonb_typeof(p_address) <> 'object'
    or octet_length(p_contact::text) > 4096 or octet_length(p_address::text) > 4096 then
    raise exception using message = 'VALIDATION_ERROR', errcode = 'P0001';
  end if;
  previous := private.claim_command(actor.tenant_id, 'update_tenant', p_idempotency_key,
    jsonb_build_object('membership', p_membership_id, 'revision', p_expected_revision,
      'legal_name', p_legal_name, 'trade_name', p_trade_name, 'contact', p_contact, 'address', p_address));
  if previous is not null then return previous; end if;
  select t.revision into current_revision from public.tenants t where t.id = actor.tenant_id;
  if current_revision <> p_expected_revision then raise exception using message = 'STALE_VERSION', errcode = 'P0001'; end if;
  update public.tenants set legal_name = btrim(p_legal_name), trade_name = btrim(p_trade_name), contact = p_contact,
    address = p_address, revision = revision + 1, updated_at = clock_timestamp() where id = actor.tenant_id;
  insert into public.audit_events(id, tenant_id, actor_user_id, actor_membership_id, actor_kind, action,
    entity_type, entity_id, safe_metadata, request_id)
    values (event_id, actor.tenant_id, private.request_user_id(), actor.id, 'user', 'tenant.updated', 'tenant', actor.tenant_id,
      jsonb_build_object('revision', current_revision + 1), p_idempotency_key);
  result := jsonb_build_object('tenant_id', actor.tenant_id, 'revision', current_revision + 1, 'audit_event_id', event_id);
  perform private.finish_command(actor.tenant_id, 'update_tenant', p_idempotency_key, result);
  return result;
end;
$function$;
create function public.set_membership_status(p_membership_id uuid, p_target_membership_id uuid, p_status text, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $function$
declare actor public.memberships; target public.memberships; previous jsonb; result jsonb; event_id uuid := gen_random_uuid();
begin
  actor := private.require_admin(p_membership_id);
  if p_status is null or p_status not in ('active', 'inactive') then
    raise exception using message = 'VALIDATION_ERROR', errcode = 'P0001';
  end if;
  previous := private.claim_command(actor.tenant_id, 'set_membership_status', p_idempotency_key,
    jsonb_build_object('membership', p_membership_id, 'target', p_target_membership_id, 'status', p_status));
  if previous is not null then return previous; end if;
  select m.* into target from public.memberships m where m.tenant_id = actor.tenant_id and m.id = p_target_membership_id for update;
  if target.id is null then raise exception using message = 'ACCESS_DENIED', errcode = 'P0001'; end if;
  if p_status = 'inactive' and target.role = 'admin' and target.status = 'active' then
    if not private.other_active_admin(actor.tenant_id, target.id) then
      raise exception using message = 'LAST_ADMIN', errcode = 'P0001';
    end if;
  end if;
  update public.memberships set status = p_status, revision = revision + 1, updated_at = clock_timestamp()
    where tenant_id = actor.tenant_id and id = target.id;
  insert into public.audit_events(id, tenant_id, actor_user_id, actor_membership_id, actor_kind, action,
    entity_type, entity_id, safe_metadata, request_id)
    values (event_id, actor.tenant_id, private.request_user_id(), actor.id, 'user', 'membership.status_changed', 'membership', target.id,
      jsonb_build_object('from_status', target.status, 'to_status', p_status), p_idempotency_key);
  result := jsonb_build_object('membership_id', target.id, 'status', p_status, 'revision', target.revision + 1, 'audit_event_id', event_id);
  perform private.finish_command(actor.tenant_id, 'set_membership_status', p_idempotency_key, result);
  return result;
end;
$function$;

-- Private invoker function: only the SQL operator can provision the first admin.
create function private.provision_tenant(p_key uuid, p_admin_user_id uuid, p_document text,
  p_legal_name text, p_trade_name text, p_timezone text default 'America/Sao_Paulo')
returns jsonb language plpgsql security invoker set search_path = ''
as $function$
declare fingerprint text; request private.provision_requests; tenant_id uuid := gen_random_uuid(); membership_id uuid := gen_random_uuid(); result jsonb;
begin
  if p_key is null or p_admin_user_id is null or p_document is null or length(btrim(p_document)) not between 1 and 32
    or p_legal_name is null or length(btrim(p_legal_name)) not between 1 and 200
    or p_trade_name is null or length(btrim(p_trade_name)) not between 1 and 160
    or p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or not exists (select 1 from auth.users where id = p_admin_user_id)
  then raise exception using message = 'VALIDATION_ERROR', errcode = 'P0001'; end if;
  fingerprint := pg_catalog.encode(extensions.digest(jsonb_build_array(p_admin_user_id, p_document,
    p_legal_name, p_trade_name, p_timezone)::text, 'sha256'), 'hex');
  insert into private.provision_requests(key, payload_hash) values (p_key, fingerprint) on conflict do nothing;
  select r.* into strict request from private.provision_requests r where r.key = p_key for update;
  if request.payload_hash <> fingerprint then raise exception using message = 'IDEMPOTENCY_CONFLICT', errcode = 'P0001'; end if;
  if request.response is not null then return request.response; end if;
  insert into public.profiles(user_id, display_name) values (p_admin_user_id, 'Administrador') on conflict do nothing;
  if not exists (select 1 from public.profiles where user_id = p_admin_user_id and status = 'active') then
    raise exception using message = 'ACCESS_DENIED', errcode = 'P0001';
  end if;
  insert into public.tenants(id, document, legal_name, trade_name, timezone)
    values (tenant_id, btrim(p_document), btrim(p_legal_name), btrim(p_trade_name), p_timezone);
  insert into public.memberships(id, tenant_id, user_id, role) values (membership_id, tenant_id, p_admin_user_id, 'admin');
  insert into public.audit_events(tenant_id, actor_kind, action, entity_type, entity_id, request_id, safe_metadata)
    values (tenant_id, 'platform', 'tenant.provisioned', 'tenant', tenant_id, p_key, jsonb_build_object('operator', session_user));
  result := jsonb_build_object('tenant_id', tenant_id, 'membership_id', membership_id);
  update private.provision_requests set response = result where key = p_key;
  return result;
end;
$function$;
revoke all on function private.provision_tenant(uuid, uuid, text, text, text, text) from public, anon, authenticated, atacado_executor, atacado_membership_reader;
grant execute on function private.provision_tenant(uuid, uuid, text, text, text, text) to postgres;

do $migration$
declare signature regprocedure;
begin
  foreach signature in array array[
    'private.require_admin(uuid)'::regprocedure, 'private.claim_command(uuid,text,uuid,jsonb)'::regprocedure,
    'private.finish_command(uuid,text,uuid,jsonb)'::regprocedure,
    'public.get_my_contexts()'::regprocedure, 'public.get_current_context(uuid)'::regprocedure,
    'public.get_tenant_admin(uuid)'::regprocedure,
    'public.update_tenant(uuid,bigint,text,text,jsonb,jsonb,uuid)'::regprocedure,
    'public.set_membership_status(uuid,uuid,text,uuid)'::regprocedure
  ] loop
    execute format('alter function %s owner to atacado_executor', signature);
    execute format('revoke all on function %s from public, anon, authenticated', signature);
  end loop;
end;
$migration$;
grant execute on function public.get_my_contexts(), public.get_current_context(uuid), public.get_tenant_admin(uuid),
  public.update_tenant(uuid,bigint,text,text,jsonb,jsonb,uuid), public.set_membership_status(uuid,uuid,text,uuid) to authenticated;
revoke create on schema private from atacado_executor, atacado_membership_reader;
revoke create on schema public from atacado_executor;

comment on table public.customers is 'F1 minimum identity projection; commercial fields belong to F2.';
comment on table public.invitations is 'F1.A schema only; provider workflow is not implemented yet.';
notify pgrst, 'reload schema';
commit;
