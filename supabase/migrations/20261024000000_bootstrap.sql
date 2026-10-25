-- F0: infraestrutura somente. Entidades, papéis RPC e RLS de negócio ficam na F1.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
comment on schema private is 'Internal application objects; never expose through the Data API.';

commit;
