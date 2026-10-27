-- psql variables come only from the local runner's real Auth users/UUIDs.
begin;
insert into public.profiles(user_id, display_name, status) values
  (:'adminA2', 'Admin A2 fictício', 'active'),
  (:'sellerA', 'Vendedor A fictício', 'active'),
  (:'buyerA1', 'Comprador A1 fictício', 'active'),
  (:'buyerA2', 'Comprador A2 fictício', 'active'),
  (:'sellerB', 'Vendedor B fictício', 'active'),
  (:'buyerB', 'Comprador B fictício', 'active'),
  (:'multi', 'Comprador multivínculo fictício', 'active'),
  (:'disabled', 'Usuário inativo fictício', 'inactive'),
  (:'orphan', 'Usuário sem vínculo fictício', 'active')
on conflict (user_id) do nothing;
insert into public.customers(id, tenant_id, document, name) values
  (:'customerA1', :'tenantA', 'A1-' || :'runId', 'Cliente fictício A1'),
  (:'customerA2', :'tenantA', 'A2-' || :'runId', 'Cliente fictício A2'),
  (:'customerB', :'tenantB', 'B1-' || :'runId', 'Cliente fictício B1')
on conflict (id) do nothing;
insert into public.memberships(id, tenant_id, user_id, role, customer_id) values
  (:'memberAdminA2', :'tenantA', :'adminA2', 'admin', null),
  (:'memberSellerA', :'tenantA', :'sellerA', 'seller', null),
  (:'memberBuyerA1', :'tenantA', :'buyerA1', 'buyer', :'customerA1'),
  (:'memberBuyerA2', :'tenantA', :'buyerA2', 'buyer', :'customerA2'),
  (:'memberSellerB', :'tenantB', :'sellerB', 'seller', null),
  (:'memberBuyerB', :'tenantB', :'buyerB', 'buyer', :'customerB'),
  (:'memberMultiA', :'tenantA', :'multi', 'buyer', :'customerA2'),
  (:'memberMultiB', :'tenantB', :'multi', 'buyer', :'customerB'),
  (:'memberDisabled', :'tenantA', :'disabled', 'seller', null)
on conflict (id) do nothing;
update public.customers set seller_membership_id = :'memberSellerA' where id = :'customerA1';
update public.customers set seller_membership_id = :'memberSellerB' where id = :'customerB';
commit;
