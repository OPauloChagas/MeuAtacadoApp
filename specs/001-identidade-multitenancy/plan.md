# 001 — Plano técnico

## Ordem

F1.A (itens 1–4 e integração de dados do item 9), F1.B (Auth/contexto) e F1.C
(administração/convites) concluídas localmente. Parar após registrar evidências;
não iniciar F2 automaticamente. Implantação/piloto exigem etapa própria.
Preservar alterações locais de integração F0 já existentes. Branch desta etapa:
`feat/001-identity-foundation`. Nenhuma migration ou publicação remota autorizada
por esta implementação.

1. Inspecionar o projeto, instruções e versões; registrar baseline de build.
2. Criar migrations de tenants, profiles, memberships, customers mínimos, invitations, auditoria e idempotência; constraints e índices.
3. Configurar papéis/grants/RLS e helpers privados sem recursão. Proibir DML direto autenticado.
4. Criar provisionamento restrito idempotente e seed de dois tenants com funções e clientes distintos.
5. Integrar Auth SSR conforme documentação atual; verificar identidade no servidor.
6. Implementar contexto validado em cada caso de uso, política de cache e troca de contexto.
7. Implementar login, recuperação, seletor, layout e menus por função.
8. Implementar manutenção administrativa limitada ao tenant, proteção do último admin e fluxo de convite com reconciliação.
9. Rodar integração de isolamento e E2E responsivo; documentar resultados.

## Artefatos esperados

### Execução F1.B

1. Revalidar SDKs oficiais/peers e registrar versões exatas no lockfile.
2. Integrar @supabase/ssr no servidor e proxy, cookies e fetch no-store.
3. Implementar casos de uso de sessão/contexto e validações de entrada.
4. Entregar formulários Auth, recuperação com confirmação POST, seleção de
   acesso e navegação mínima por função. Limitar empresa a projeção de leitura.
5. Executar testes puros e Playwright com Auth/PostgREST/e-mail locais reais,
   incluindo cookies/UUIDs adulterados, revogação, cache, logout e recuperação.
6. Registrar evidências sem credenciais e parar o Docker. F1.C foi executada
   posteriormente, conforme pedido de continuação do desenvolvimento.

Manter a branch atual e alterações não commitadas anteriores. O runner E2E
injeta ambiente local somente no processo, nunca reescreve .env.local remoto.
Nenhum artefato E2E persistente deve armazenar senha, cookie, JWT ou link de
recuperação. Saídas temporárias são removidas pelo runner.

Migrations, seed fictício, helpers de autenticação/autorização, UI de acesso e navegação, adaptador Auth Admin restrito, testes, `.env.example` e instruções locais. Nenhum segredo incluído.

## Riscos a resolver

### Execução F1.C

1. Revalidar versões/fontes oficiais de Auth Admin, SMTP e runtime.
2. Migration incremental: projeções administrativas, solicitação/claim/finish/
   cancel/aceite de convite; RLS do executor e leitura mínima de identidade.
3. Manter um lock transacional de tenant comum aos comandos administrativos e
   aceite, incluindo consumidores ainda sem membership. Proibir acesso direto.
4. Adaptador server-only de geração de link e SMTP, sob autorização antes de
   cada tentativa, com estado/lease persistentes; nunca usar chave elevada no DB.
5. Formulários de empresa/status/convite/retry/cancel e confirmação/aceite.
6. Testar integração real local: dois tenants, falha de SMTP, concorrência,
   repetição, identidade existente/nova, cancelamento e revogação. Registrar
   resultados reais, encerrar Docker e não avançar F2 automaticamente.

Recursão de policies em memberships; RPC criada com dono privilegiado por padrão; cache privado compartilhado; confiança indevida em metadata de usuário; falha entre convite Auth e vínculo no banco; identidade com múltiplos papéis no mesmo tenant.

## Verificação

F1.A: runner Node 24 sem SDK novo; sobe sobre Docker Supabase, cria atores pelo
Auth Admin local e autentica cada um por e-mail/senha. Somente esse setup usa chave
elevada; requests de dados/RPC usam publishable + JWT real. SQL via docker exec
apenas para provisionamento restrito, fixtures e asserções de integridade/catálogo.
O runner recusa URLs remotas e não lê .env.local, que aponta para o desenvolvimento
remoto. CI executa o mesmo teste depois do reset local.

Cobrir AC01–AC12 e T01–T07, T25–T28 aplicáveis. Registrar comandos reais em tasks. Não avançar a F2 com isolamento quebrado, testes simulados ou privilégio de bypass usado para mascarar falhas.
