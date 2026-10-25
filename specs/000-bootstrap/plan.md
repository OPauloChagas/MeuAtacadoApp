# 000 — Plano técnico

## Contexto

Repositório inicial contém somente documentos, todos ainda não rastreados pelo
Git, e nenhum commit. Não há aplicação a substituir. Instruções lidas: README,
AGENTS, CLAUDE, docs 00/01/02/03/05/06/07/09/10/12 e spec/plan/tasks de F1.

## Sequência

1. Consultar documentação oficial, metadados dos pacotes e compatibilidade;
   registrar versões em docs/13-ambiente-local.md e ADR-007.
2. Criar base mínima Next.js App Router com TypeScript estrito e página pt-BR.
3. Configurar ambiente validado sob demanda, exemplos e ignores; não conectar
   aplicação a serviços remotos nem criar clientes privilegiados.
4. Instalar ferramentas fixadas e lockfile; configurar ESLint, Vitest e Playwright.
5. Inicializar Supabase CLI, limitar serviços/portas locais, migration de schema
   privado sem entidades comerciais, seed sem dados e teste pgTAP técnico.
6. Adicionar CI web/banco sem credenciais externas. Executar verificações reais,
   corrigir falhas e registrar evidências antes de encerrar F0.

## Validação

AC01: npm ci, npm ls, versões executadas e fontes oficiais.
AC02/AC03: smoke Playwright contra build real nas cinco larguras; lint, tsc e
Vitest. Não declarar WCAG completa nem metas de desempenho atendidas.
AC04: testes positivos/negativos da configuração, revisão de ignores e exemplos.
AC05: supabase start, db reset --local, db lint --local e test db, sem link remoto.
AC06: revisão do workflow e execução local de seus comandos; execução hospedada
somente após repositório/CI disponíveis.

## Implantação e recuperação

Nenhuma implantação. Reset permitido somente no banco Docker deste projeto.
Migration F0 não contém dados comerciais. A aplicação deve compilar sem .env.local.
Parar ao terminar F0; não iniciar F1 automaticamente.
