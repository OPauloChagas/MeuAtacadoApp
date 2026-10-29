# Plano F2.D

1. Preservar base limpa cf4d60e, branch feat/002-catalog-quotes; ler requisitos.
   Next16.4.3 engines/peers revalidados no registry oficial em 28/10/2026;
   Node24.22.1/npm11.11.1 mantidos, sem dependência nova.
2. Migration incremental: helpers booleanos selados no reader existente, grants
   mínimos/policies SELECT para executor e três RPCs de projeção/foto/cotação.
   Não ampliar SELECT/DML de authenticated nem acesso a comissão. Snapshot STABLE
   e numeric exato; fingerprint de mudança, sem persistência.
3. Módulo catalog, API privada de lista/foto/simulação, validação de payload limitado,
   páginas buyer e por cliente admin/seller, navegação e estados acessíveis.
4. JWTs reais e Storage local: isolamento, períodos, quantidade/dinheiro, concorrência,
   revogação e fotos; DTO whitelist/campos futuros. Regressões comercial/produtos/
   clientes/identidade/Auth/admin conforme mudanças.
5. Check/SQL e evidências; reset/encerrar serviços locais, sem avançar F3.

Retomada em 28–29/10: runtime Node24.22.1 instalado somente em diretório
temporário, pois o runtime da rodada anterior não existia mais; npm11.11.1 e
lockfile preservados. Header de seleção protege abas com contexto obsoleto;
nenhuma nova biblioteca ou privilégio cru de authenticated.

Fontes oficiais consultadas em 28/10/2026:
[snapshot STABLE](https://www.postgresql.org/docs/17/xfunc-volatility.html),
[numeric](https://www.postgresql.org/docs/17/datatype-numeric.html),
[Storage](https://supabase.com/docs/guides/storage/security/access-control).
