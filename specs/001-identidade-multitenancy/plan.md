# 001 — Plano técnico

## Ordem

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

Migrations, seed fictício, helpers de autenticação/autorização, UI de acesso e navegação, adaptador Auth Admin restrito, testes, `.env.example` e instruções locais. Nenhum segredo incluído.

## Riscos a resolver

Recursão de policies em memberships; RPC criada com dono privilegiado por padrão; cache privado compartilhado; confiança indevida em metadata de usuário; falha entre convite Auth e vínculo no banco; identidade com múltiplos papéis no mesmo tenant.

## Verificação

Cobrir AC01–AC12 e T01–T07, T25–T28 aplicáveis. Registrar comandos reais em tasks. Não avançar a F2 com isolamento quebrado, testes simulados ou privilégio de bypass usado para mascarar falhas.
