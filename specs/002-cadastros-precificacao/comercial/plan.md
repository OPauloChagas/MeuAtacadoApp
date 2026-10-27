# Plano F2.C

1. Ler instruções/requisitos e preservar F2.B na branch feat/002-commercial-versions.
   Revalidar patches fixados; Next 16.4.3 engines/peers oficiais conferidos em
   27/10/2026, Node 24.22.1/React 19 compatíveis. Sem dependência nova antecipada.
2. Migration com oito tabelas comerciais, FKs em customers, índices/exclusões
   btree_gist, triggers de imutabilidade e papel seller histórico, RLS/grants e
   RPCs autorizadas. Draft/publicação/item e atribuições serializados com F1/B.
3. Módulo commercial: decimais exatos como string/BigInt, datas de calendário,
   validação/DTOs e casos de uso. Actions específicas e endpoints GET privados.
4. Interface admin para tabelas/versões/itens, condições e atribuições, seletores
   paginados e busca literal. Reusar convenções de navegação completa/estado/teclado.
5. Auth/PostgREST/PostgreSQL reais locais: isolamento, precisão, imutabilidade,
   período, auditoria/repetição/concorrência, interface e regressões anteriores.
6. Check/SQL e evidências reais. Encerrar Docker. Sem commit/push/deploy remoto.

Fontes oficiais consultadas em 27/10/2026:
[numeric PostgreSQL 17](https://www.postgresql.org/docs/17/datatype-numeric.html),
[ranges/exclusion](https://www.postgresql.org/docs/17/rangetypes.html),
[RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
e registry npm dos patches fixados. Sem aritmética de dinheiro em ponto flutuante.
