begin;

alter table public.invitations drop constraint invitations_state_check;
alter table public.invitations add constraint invitations_state_check check (state in ('pending','sent','failed','accepted','cancelled'));
alter table public.invitations
  add column expires_at timestamptz not null default (now() + interval '7 days'),
  add column delivery_token uuid,
  add column lease_until timestamptz,
  add column attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  add column failure_code text check (failure_code in ('AUTH_PROVIDER_UNAVAILABLE','EMAIL_PROVIDER_UNAVAILABLE')),
  add column accepted_by_user_id uuid references auth.users(id) on delete restrict,
  add column accepted_membership_id uuid,
  add column acceptance_response jsonb,
  add foreign key (tenant_id, accepted_membership_id) references public.memberships(tenant_id,id) on delete restrict,
  add constraint invitation_acceptance_complete check (
    (state = 'accepted' and accepted_by_user_id is not null and accepted_membership_id is not null and acceptance_response is not null)
    or (state <> 'accepted' and accepted_by_user_id is null and accepted_membership_id is null and acceptance_response is null));
create index invitations_accepted_fk on public.invitations(tenant_id,accepted_membership_id);
create unique index invitations_open_unique on public.invitations(tenant_id,email,role,coalesce(customer_id,'00000000-0000-0000-0000-000000000000'::uuid))
  where state in ('pending','sent','failed');
create index invitations_tenant_time on public.invitations(tenant_id,created_at desc);

-- Read-only bridge into Supabase-owned Auth: only the current actor, never a
-- browser-supplied user ID or list of identities. No business mutation bypass.
create function private.actor_email_matches(p_email text, p_require_password boolean default true)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from auth.users u where u.id = private.request_user_id()
  and lower(u.email) = p_email and u.email_confirmed_at is not null
  and (not p_require_password or (coalesce(length(u.encrypted_password),0)>0 and (
    u.invited_at is null
    or exists(select 1 from public.profiles p where p.user_id=u.id)
    or exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) method where method->>'method'='password')
  )))); $$;
revoke all on function private.actor_email_matches(text,boolean) from public,anon,authenticated;
grant execute on function private.actor_email_matches(text,boolean) to atacado_executor,atacado_membership_reader;

grant create on schema private to atacado_membership_reader,atacado_executor;
grant create on schema public to atacado_executor;
grant select (id,tenant_id,email,role,customer_id,requested_by_membership_id,state,expires_at,accepted_by_user_id,accepted_membership_id)
  on public.invitations to atacado_membership_reader;
create policy reader_invitations on public.invitations for select to atacado_membership_reader using (true);

create function private.admin_shares_profile(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $$ select exists(select 1 from public.memberships m where m.user_id=p_user_id and private.active_admin(m.tenant_id)); $$;

create function private.recipient_invitation(p_id uuid, p_password boolean default false)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $$ select exists(
  select 1 from public.invitations i
  join public.tenants t on t.id=i.tenant_id and t.status='active'
  join public.memberships approver on approver.tenant_id=i.tenant_id and approver.id=i.requested_by_membership_id
  join public.profiles p on p.user_id=approver.user_id and p.status='active'
  left join public.customers c on c.tenant_id=i.tenant_id and c.id=i.customer_id
  where i.id=p_id and private.actor_email_matches(i.email,p_password)
    and not exists(select 1 from public.profiles blocked where blocked.user_id=private.request_user_id() and blocked.status<>'active')
    and approver.role='admin' and approver.status='active' and (i.role<>'buyer' or c.status='active')
    and ((i.state='sent' and i.expires_at>now()) or (i.state='accepted'
      and i.accepted_by_user_id=private.request_user_id() and private.active_membership(i.accepted_membership_id)))
); $$;
create function private.recipient_tenant(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $$ select exists(select 1 from public.invitations i where i.tenant_id=p_tenant and private.recipient_invitation(i.id)); $$;
create function private.invited_membership(p_tenant uuid,p_user uuid,p_role text,p_customer uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $$ select p_user=private.request_user_id() and exists(select 1 from public.invitations i
  where i.tenant_id=p_tenant and i.role=p_role and i.customer_id is not distinct from p_customer
  and i.state='sent' and private.recipient_invitation(i.id,true)); $$;
create function private.recipient_customer(p_tenant uuid,p_customer uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = on
as $$ select exists(select 1 from public.invitations i where i.tenant_id=p_tenant and i.customer_id=p_customer and private.recipient_invitation(i.id)); $$;

do $migration$
declare signature regprocedure;
begin
  foreach signature in array array['private.admin_shares_profile(uuid)'::regprocedure,
    'private.recipient_invitation(uuid,boolean)'::regprocedure,'private.recipient_tenant(uuid)'::regprocedure,
    'private.invited_membership(uuid,uuid,text,uuid)'::regprocedure,'private.recipient_customer(uuid,uuid)'::regprocedure] loop
    execute format('alter function %s owner to atacado_membership_reader',signature);
    execute format('revoke all on function %s from public,anon,authenticated',signature);
    execute format('grant execute on function %s to atacado_executor',signature);
  end loop;
end $migration$;

grant select,insert,update on public.invitations to atacado_executor;
grant insert (user_id,display_name) on public.profiles to atacado_executor;
grant insert (id,tenant_id,user_id,role,customer_id) on public.memberships to atacado_executor;
grant select (tenant_id,action,occurred_at) on public.audit_events to atacado_executor;
create policy audit_delivery_rate_read on public.audit_events for select to atacado_executor using (private.active_admin(tenant_id));
create policy profiles_admin_projection on public.profiles for select to atacado_executor using (private.admin_shares_profile(user_id));
create policy profiles_recipient_insert on public.profiles for insert to atacado_executor
  with check (user_id=private.request_user_id() and status='active' and exists(
    select 1 from public.invitations i where i.state='sent' and private.recipient_invitation(i.id,true)));
create policy memberships_recipient_read on public.memberships for select to atacado_executor using (user_id=private.request_user_id());
create policy memberships_recipient_insert on public.memberships for insert to atacado_executor
  with check (status='active' and private.invited_membership(tenant_id,user_id,role,customer_id));
create policy tenants_recipient_read on public.tenants for select to atacado_executor using (private.recipient_tenant(id));
create policy customers_recipient_read on public.customers for select to atacado_executor using (private.recipient_customer(tenant_id,id));
create policy invitations_read on public.invitations for select to atacado_executor
  using (private.active_admin(tenant_id) or private.recipient_invitation(id));
create policy invitations_insert on public.invitations for insert to atacado_executor
  with check (private.active_admin(tenant_id) and private.owns_membership(tenant_id,requested_by_membership_id));
create policy invitations_update on public.invitations for update to atacado_executor
  using (private.active_admin(tenant_id) or private.recipient_invitation(id))
  with check (private.active_admin(tenant_id) or private.recipient_invitation(id));

-- The same lock is used by an invited actor who has no membership yet. It
-- precedes the existing tenant row lock, preserving one order for all commands.
create or replace function private.require_admin(p_membership_id uuid)
returns public.memberships language plpgsql set search_path = '' set row_security = on
as $$ declare actor public.memberships;
begin
  select m.* into actor from public.memberships m where m.id=p_membership_id
    and m.user_id=private.request_user_id() and m.role='admin' and m.status='active';
  if actor.id is null then raise exception 'ACCESS_DENIED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor.tenant_id::text,26));
  perform 1 from public.tenants t where t.id=actor.tenant_id and t.status='active' for update;
  if not found or not private.active_admin(actor.tenant_id) or not private.active_membership(p_membership_id) then raise exception 'ACCESS_DENIED'; end if;
  return actor;
end $$;

create function public.get_tenant_access(p_membership_id uuid,p_page integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' set row_security = on
as $$ declare actor public.memberships; result jsonb;
begin
  select m.* into actor from public.memberships m where m.id=p_membership_id and m.user_id=private.request_user_id()
    and m.role='admin' and private.active_membership(m.id);
  if actor.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_page is null or p_page<0 or p_page>10000 then raise exception 'VALIDATION_ERROR'; end if;
  select jsonb_build_object(
    'members',coalesce((select jsonb_agg(to_jsonb(x)) from (select m.id,m.role,m.status,m.revision,p.display_name,
      c.name as customer_name,m.id=actor.id as is_self from public.memberships m join public.profiles p on p.user_id=m.user_id
      left join public.customers c on c.tenant_id=m.tenant_id and c.id=m.customer_id
      where m.tenant_id=actor.tenant_id order by m.created_at,m.id limit 25 offset p_page*25) x),'[]'::jsonb),
    'invitations',coalesce((select jsonb_agg(to_jsonb(x)) from (select i.id,i.email,i.role,i.state,i.attempt_count,i.failure_code,
      i.lease_until,i.expires_at,c.name as customer_name from public.invitations i left join public.customers c on c.tenant_id=i.tenant_id and c.id=i.customer_id
      where i.tenant_id=actor.tenant_id order by i.created_at desc,i.id limit 25 offset p_page*25) x),'[]'::jsonb),
    'customers',coalesce((select jsonb_agg(to_jsonb(x)) from (select c.id,c.name from public.customers c
      where c.tenant_id=actor.tenant_id and c.status='active' order by c.name,c.id limit 200) x),'[]'::jsonb),
    'member_count',(select count(*) from public.memberships m where m.tenant_id=actor.tenant_id),
    'invitation_count',(select count(*) from public.invitations i where i.tenant_id=actor.tenant_id)) into result;
  return result;
end $$;

create function public.request_invitation(p_membership_id uuid,p_email text,p_role text,p_customer_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $$ declare actor public.memberships; previous jsonb; invitation_id uuid; result jsonb;
begin
  actor:=private.require_admin(p_membership_id);
  if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_role is null or p_role not in ('admin','seller','buyer')
    or (p_role='buyer')<>(p_customer_id is not null) then raise exception 'VALIDATION_ERROR'; end if;
  if p_customer_id is not null and not exists(select 1 from public.customers c where c.tenant_id=actor.tenant_id and c.id=p_customer_id and c.status='active') then raise exception 'ACCESS_DENIED'; end if;
  previous:=private.claim_command(actor.tenant_id,'request_invitation',p_idempotency_key,
    jsonb_build_array(p_membership_id,p_email,p_role,p_customer_id));
  if previous is not null then return previous; end if;
  select i.id into invitation_id from public.invitations i where i.tenant_id=actor.tenant_id and i.email=lower(btrim(p_email))
    and i.role=p_role and i.customer_id is not distinct from p_customer_id and i.state in ('pending','sent','failed');
  if invitation_id is null then
    invitation_id:=gen_random_uuid();
    insert into public.invitations(id,tenant_id,email,role,customer_id,requested_by_membership_id)
      values(invitation_id,actor.tenant_id,lower(btrim(p_email)),p_role,p_customer_id,actor.id);
    insert into public.audit_events(tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
      values(actor.tenant_id,private.request_user_id(),actor.id,'user','invitation.requested','invitation',invitation_id,p_idempotency_key);
  end if;
  result:=jsonb_build_object('invitation_id',invitation_id);
  perform private.finish_command(actor.tenant_id,'request_invitation',p_idempotency_key,result);
  return result;
end $$;

create function public.claim_invitation_delivery(p_membership_id uuid,p_invitation_id uuid,p_attempt_id uuid,p_retry boolean default false)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $$ declare actor public.memberships; invitation public.invitations;
begin
  actor:=private.require_admin(p_membership_id);
  select i.* into invitation from public.invitations i where i.id=p_invitation_id and i.tenant_id=actor.tenant_id for update;
  if invitation.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_attempt_id is null or p_retry is null then raise exception 'VALIDATION_ERROR'; end if;
  if invitation.state in ('accepted','cancelled') or invitation.expires_at<=now() then raise exception 'INVALID_STATE'; end if;
  if (invitation.state='sent' and not p_retry) or (invitation.state='pending' and invitation.lease_until>now()) then
    return jsonb_build_object('claimed',false,'state',invitation.state); end if;
  if invitation.attempt_count>=5 or (select count(*) from public.audit_events a where a.tenant_id=actor.tenant_id
    and a.action='invitation.delivery_started' and a.occurred_at>now()-interval '1 hour')>=30 then raise exception 'RATE_LIMITED'; end if;
  if invitation.customer_id is not null and not exists(select 1 from public.customers c where c.tenant_id=actor.tenant_id and c.id=invitation.customer_id and c.status='active') then raise exception 'ACCESS_DENIED'; end if;
  update public.invitations set state='pending',delivery_token=p_attempt_id,lease_until=clock_timestamp()+interval '2 minutes',
    attempt_count=attempt_count+1,failure_code=null,requested_by_membership_id=actor.id where id=invitation.id;
  insert into public.audit_events(tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
    values(actor.tenant_id,private.request_user_id(),actor.id,'user','invitation.delivery_started','invitation',invitation.id,p_attempt_id);
  return jsonb_build_object('claimed',true,'email',invitation.email,'invitation_id',invitation.id);
end $$;

create function public.finish_invitation_delivery(p_membership_id uuid,p_invitation_id uuid,p_attempt_id uuid,p_sent boolean,p_failure_code text default null)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $$ declare actor public.memberships; invitation public.invitations;
begin
  actor:=private.require_admin(p_membership_id);
  select i.* into invitation from public.invitations i where i.id=p_invitation_id and i.tenant_id=actor.tenant_id for update;
  if invitation.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_sent is null or (not p_sent and (p_failure_code is null or p_failure_code not in ('AUTH_PROVIDER_UNAVAILABLE','EMAIL_PROVIDER_UNAVAILABLE'))) then raise exception 'VALIDATION_ERROR'; end if;
  if invitation.delivery_token is distinct from p_attempt_id or p_attempt_id is null then raise exception 'INVALID_STATE'; end if;
  if invitation.state in ('sent','failed','accepted') then return jsonb_build_object('state',invitation.state); end if;
  if invitation.state<>'pending' then raise exception 'INVALID_STATE'; end if;
  update public.invitations set state=case when p_sent then 'sent' else 'failed' end,lease_until=null,
    provider_reference=p_attempt_id::text,failure_code=case when p_sent then null else p_failure_code end where id=invitation.id;
  insert into public.audit_events(tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id,safe_metadata)
    values(actor.tenant_id,private.request_user_id(),actor.id,'user','invitation.delivery_finished','invitation',invitation.id,p_attempt_id,jsonb_build_object('sent',p_sent));
  return jsonb_build_object('state',case when p_sent then 'sent' else 'failed' end);
end $$;

create function public.cancel_invitation(p_membership_id uuid,p_invitation_id uuid,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $$ declare actor public.memberships; previous jsonb; invitation public.invitations; result jsonb;
begin
  actor:=private.require_admin(p_membership_id);
  previous:=private.claim_command(actor.tenant_id,'cancel_invitation',p_idempotency_key,jsonb_build_array(p_membership_id,p_invitation_id));
  if previous is not null then return previous; end if;
  select i.* into invitation from public.invitations i where i.id=p_invitation_id and i.tenant_id=actor.tenant_id for update;
  if invitation.id is null then raise exception 'ACCESS_DENIED'; end if;
  if invitation.state='accepted' then raise exception 'INVALID_STATE'; end if;
  if invitation.state<>'cancelled' then
    update public.invitations set state='cancelled',lease_until=null where id=invitation.id;
    insert into public.audit_events(tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
      values(actor.tenant_id,private.request_user_id(),actor.id,'user','invitation.cancelled','invitation',invitation.id,p_idempotency_key);
  end if;
  result:=jsonb_build_object('invitation_id',invitation.id,'state','cancelled');
  perform private.finish_command(actor.tenant_id,'cancel_invitation',p_idempotency_key,result);
  return result;
end $$;

create function public.get_my_invitation(p_invitation_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set row_security = on
as $$ declare result jsonb;
begin
  select jsonb_build_object('id',i.id,'company_name',t.trade_name,'email',i.email,'role',i.role,
    'customer_name',c.name,'state',i.state,'requires_password',not private.actor_email_matches(i.email,true)) into result
  from public.invitations i join public.tenants t on t.id=i.tenant_id
  left join public.customers c on c.tenant_id=i.tenant_id and c.id=i.customer_id
  where i.id=p_invitation_id and private.recipient_invitation(i.id);
  if result is null then raise exception 'ACCESS_DENIED'; end if;
  return result;
end $$;

create function public.accept_invitation(p_invitation_id uuid,p_display_name text,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = '' set row_security = on
as $$ declare invitation public.invitations; member public.memberships; result jsonb; previous jsonb; event_id uuid:=gen_random_uuid();
begin
  select i.* into invitation from public.invitations i where i.id=p_invitation_id and private.recipient_invitation(i.id,true);
  if invitation.id is null then raise exception 'ACCESS_DENIED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(invitation.tenant_id::text,26));
  select i.* into invitation from public.invitations i where i.id=p_invitation_id and private.recipient_invitation(i.id,true) for update;
  if invitation.id is null then raise exception 'ACCESS_DENIED'; end if;
  if p_display_name is null or length(btrim(p_display_name)) not between 1 and 120 then raise exception 'VALIDATION_ERROR'; end if;
  if invitation.state='accepted' then
    previous:=private.claim_command(invitation.tenant_id,'accept_invitation',p_idempotency_key,jsonb_build_array(p_invitation_id,p_display_name));
    if previous is not null then return previous; end if;
    perform private.finish_command(invitation.tenant_id,'accept_invitation',p_idempotency_key,invitation.acceptance_response);
    return invitation.acceptance_response;
  end if;
  insert into public.profiles(user_id,display_name) values(private.request_user_id(),btrim(p_display_name)) on conflict do nothing;
  if not exists(select 1 from public.profiles p where p.user_id=private.request_user_id() and p.status='active') then raise exception 'ACCESS_DENIED'; end if;
  select m.* into member from public.memberships m where m.tenant_id=invitation.tenant_id and m.user_id=private.request_user_id()
    and m.role=invitation.role and m.customer_id is not distinct from invitation.customer_id;
  if member.id is not null and member.status<>'active' then raise exception 'ACCESS_DENIED'; end if;
  if member.id is null then
    insert into public.memberships(id,tenant_id,user_id,role,customer_id)
      values(gen_random_uuid(),invitation.tenant_id,private.request_user_id(),invitation.role,invitation.customer_id) returning * into member;
  end if;
  previous:=private.claim_command(invitation.tenant_id,'accept_invitation',p_idempotency_key,jsonb_build_array(p_invitation_id,p_display_name));
  if previous is not null then return previous; end if;
  result:=jsonb_build_object('membership_id',member.id,'audit_event_id',event_id);
  update public.invitations set state='accepted',accepted_by_user_id=private.request_user_id(),accepted_membership_id=member.id,
    acceptance_response=result where id=invitation.id;
  insert into public.audit_events(id,tenant_id,actor_user_id,actor_membership_id,actor_kind,action,entity_type,entity_id,request_id)
    values(event_id,invitation.tenant_id,private.request_user_id(),member.id,'user','invitation.accepted','invitation',invitation.id,p_idempotency_key);
  perform private.finish_command(invitation.tenant_id,'accept_invitation',p_idempotency_key,result);
  return result;
end $$;

do $migration$
declare signature regprocedure;
begin
  foreach signature in array array['public.get_tenant_access(uuid,integer)'::regprocedure,
    'public.request_invitation(uuid,text,text,uuid,uuid)'::regprocedure,
    'public.claim_invitation_delivery(uuid,uuid,uuid,boolean)'::regprocedure,
    'public.finish_invitation_delivery(uuid,uuid,uuid,boolean,text)'::regprocedure,
    'public.cancel_invitation(uuid,uuid,uuid)'::regprocedure,
    'public.get_my_invitation(uuid)'::regprocedure,'public.accept_invitation(uuid,text,uuid)'::regprocedure] loop
    execute format('alter function %s owner to atacado_executor',signature);
    execute format('revoke all on function %s from public,anon,authenticated',signature);
    execute format('grant execute on function %s to authenticated',signature);
  end loop;
end $migration$;
revoke create on schema private from atacado_executor,atacado_membership_reader;
revoke create on schema public from atacado_executor;
notify pgrst,'reload schema';
commit;
