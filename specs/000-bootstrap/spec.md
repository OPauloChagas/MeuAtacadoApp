# 000 — Bootstrap e ambientes (F0)

Status: validada localmente. Data: 24/10/2026. CI hospedada não executada.
Requisitos: RNF10; RNF01/RNF02/RNF09 apenas na página inicial técnica.
Dependências: Node.js LTS, npm e Docker local. Sem credenciais remotas.

## Objetivo e escopo

Preparar uma base executável e reproduzível para a próxima fase de identidade.
Preservar o pacote SDD existente. Incluir Next.js App Router, TypeScript estrito,
lint, testes unitários e smoke E2E, build, ambiente de exemplo, Supabase local,
migration técnica inicial, seed vazio e CI sem segredos.

Excluir autenticação, usuários, tenants, tabelas comerciais, RLS de negócio,
pedidos, financeiro, publicação e qualquer alteração em banco remoto.
Não exibir ações de funcionalidades ainda não implementadas.

## Critérios de aceite

AC01. Versões estáveis compatíveis têm fontes oficiais, justificativa e lockfile;
instalação limpa é reproduzível com npm ci em Node.js LTS fixado.
AC02. Página inicial pt-BR sobe sem credenciais Supabase, com HTML semântico e sem
rolagem horizontal nas larguras de 360, 390, 768, 1024 e 1440 px.
AC03. Lint, typecheck, testes unitários, smoke E2E e build passam localmente;
resultados e limites ficam registrados nas tarefas.
AC04. .env.example contém somente nomes e placeholders; arquivos locais de
ambiente e artefatos gerados são ignorados. Configuração pública recusa chaves
elevadas e configuração ausente/inválida sem imprimir seus valores.
AC05. Supabase tem configuração versionada, migration e seed locais reproduzíveis;
reset local, lint SQL e teste técnico de banco são executados em Docker.
Não introduzir entidades de F1 para criar um teste de isolamento artificial.
AC06. CI instala pelo lockfile e executa as verificações web e de banco local sem
secrets. Publicação e execução remota da CI não fazem parte deste aceite local.

## Decisões e limites

Bootstrap manual para não sobrescrever README, instruções, docs ou specs.
Bibliotecas de formulários, componentes, domínio e integração Auth SSR serão
adicionadas quando houver caso de uso na fase correspondente.
F1 permanece em specs/001-identidade-multitenancy/, sem tarefas marcadas por F0.
