# 002 — Plano técnico

F2.A abaixo é histórico concluído. F2.B consta em produtos/plan.md e F2.C em
comercial/plan.md. Branch atual feat/002-commercial-versions preserva F2.B não
commitada e base publicada 4403916. Configuração inicial remota adiada conforme
o pedido atual. F2.D permanece pendente; não iniciar automaticamente.

1. Inspecionar/preservar F0/F1 e revalidar versões/fontes oficiais. Branch criada:
   feat/002-customers-portfolio, mantendo todas as alterações anteriores não
   commitadas no workspace. Não misturar publicação ou descartar dependências F1.
2. Migration incremental em customers: contato/endereço, revisão, updated_at e
   chave de documento normalizada. Restringir grants de coluna de authenticated.
3. RPCs públicas dedicadas: list/detail/seller-options e create/admin-update/
   contact-update. Autorizar o vínculo selecionado e serializar writes com o
   advisory lock do tenant já usado na F1 e lock do cliente. Manter RLS/constraints.
4. Módulo customers em TypeScript estrito com validação/DTOs/casos de uso,
   formulários e páginas de admin/seller/buyer, endpoints privados e menus reais.
5. Runner Playwright isolado com Auth/PostgREST reais, JWTs comuns e dados
   fictícios: positivos, negativos, concorrência/repetição, auditoria/IDOR/cache.
6. Lint/tipos/unidade/build, SQL lint/pgTAP e regressões F1 aplicáveis. Registrar
   comandos/resultados reais e limites. Parar Docker e não iniciar F2.B.

Sem dependências novas por antecipação. Patches fixados/lockfile mantidos quando
compatíveis; metadados oficiais conferidos. Ambiente local injetado no processo,
sem reescrever .env.local remoto. Sem migrations/deploy/convites reais remotos.
