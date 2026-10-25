-- Smoke técnico real, sem alegação de cobertura de RLS/multi-tenancy.
begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

select has_schema('private', 'private schema exists after migrations');
select ok(has_schema_privilege('postgres', 'private', 'USAGE'), 'migration owner can use private schema');
select ok(has_schema_privilege('postgres', 'private', 'CREATE'), 'migration owner can create internal objects');
select ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'anon cannot use private schema');
select ok(not has_schema_privilege('anon', 'private', 'CREATE'), 'anon cannot create private objects');
select ok(not has_schema_privilege('authenticated', 'private', 'USAGE'), 'authenticated cannot use private schema');
select ok(not has_schema_privilege('authenticated', 'private', 'CREATE'), 'authenticated cannot create private objects');

select * from finish();
rollback;
