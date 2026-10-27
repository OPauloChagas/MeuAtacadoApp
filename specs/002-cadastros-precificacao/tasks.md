# 002 — Tarefas e evidências

Status: F2.A concluída localmente em 27/10/2026. F2 completa ainda pendente.

- [x] 002.1 Inspecionar instruções e definir o recorte/aceite de F2.A.
- [x] 002.2 Evoluir customers/grants/RLS e contratos RPC.
- [x] 002.3 Implementar casos de uso, formulário admin/seller e leitura buyer.
- [x] 002.4 Testar isolamento/repetição/concorrência/auditoria/carteira reais.
- [x] 002.5 Verificar interface responsiva/teclado, lint/tipos/unidade/build/SQL.
- [x] 002.6 Registrar evidências e limites, encerrar serviços locais.
- [ ] 002.7 F2.B — produtos/SKU/arquivos (não iniciar automaticamente).
- [ ] 002.8 F2.C — versões e atribuições de preço/comissão/pagamento.
- [ ] 002.9 F2.D — catálogo/cotação buyer e prova de projeções comerciais.

## Entrega e preservação

Branch feat/002-customers-portfolio criada a partir do workspace existente,
preservando alterações ainda não commitadas de F0/F1. Migration incremental
20261027000000, seis RPCs públicas, módulos/componentes customers, rotas
/empresa/clientes e /cliente/minha-conta, endpoints privados e testes. Modelo,
contratos, UX, plano de entrega e ADR-014 atualizados; operação em docs/18.
Não houve dependência nova ou alteração do lockfile por F2.A; diferenças
preexistentes do lockfile da F1 foram mantidas. Metadados oficiais dos patches
Next/Supabase revalidados em 27/10; Node 24.22.1/npm 11.11.1 utilizados.

## Verificações reais de 27/10/2026

Comandos npm executados com o runtime Node 24 local via
`PATH=/private/tmp/meuatacado-f0-runtime/node_modules/.bin:$PATH`.
Todos os comandos abaixo encerraram com código 0 na rodada final.

| Comando | Resultado observado |
| --- | --- |
| `node_modules/.bin/supabase start --network-id meuatacado-local` (stdout oculto) | Stack Docker local disponível para as suítes; sem log de chaves |
| `node_modules/.bin/supabase db reset --local --network-id meuatacado-local` | Quatro migrations aplicadas do zero, incluindo 20261027000000; repetido ao final com sucesso |
| `npm run check` | ESLint sem warnings, typecheck, 33 testes unitários em 5 arquivos e build Next aprovados |
| `node_modules/.bin/supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Nenhum erro/aviso de schema; repetido após reset final |
| `node_modules/.bin/supabase test db --network-id meuatacado-local` | 7 testes pgTAP aprovados, inclusive após reset final |
| `npm run test:customers` | 12 cenários aprovados (6 por largura 360/1440), Auth/PostgREST reais, sem chave elevada no app |
| `npm run test:identity` | 23 verificações reais aprovadas; metadados conferem as 18 RPCs públicas atuais |
| `npm run test:auth` | 8 cenários aprovados em 360/1440, incluindo recuperação e troca/logout |
| `npm run test:admin` | 10 cenários aprovados em 360/1440, incluindo SMTP real do Mailpit, leases, aceite e concorrência |
| `npm run test:e2e` | 5 cenários da página inicial aprovados em 360/390/768/1024/1440 |
| `git diff --check` | Sem erros de whitespace |
| `node_modules/.bin/supabase stop` | Serviços locais encerrados preservando volumes; sem dev server remanescente |

Contadores temporários de login foram isolados entre suítes com
`docker restart supabase_auth_meuatacado-local`; limites configurados preservados.
Configuração local foi injetada somente nos processos, sem alterar .env.local.
Primeira rodada detectou expectativa incorreta de visibilidade de option nativa
no teste; corrigida para aguardar resposta da consulta e existência da opção.
Também corrigido shadowing de document no teste antes da rodada aprovada.

## Evidência por aceite

- AC01/02/07: cadastro/edição via UI e RPC, duplicata normalizada concorrente,
  documento igual em tenants distintos, seller estrangeiro/admin/inativo recusado,
  DML direto negado para admin/seller/buyer e RPC anon negada.
- AC03/04: carteira, contatos somente, reatribuição/bloqueio e replay com JWT
  anterior negado; leitura direta mínima do seller bloqueado retorna lista vazia.
- AC05/08: buyer próprio, troca A/B/logout sem estado anterior, SELECT * e
  colunas privadas negados; chave JSON interna semeada pelo operador não aparece
  no RPC nem no endpoint. Identidade com admin e seller continua limitada pelo
  contexto seller escolhido; pesquisa literal, páginas e totais isolados.
- AC06: mesma chave concorrente cria um único fato/evento; payload diferente
  conflita; revisão concorrente tem um vencedor; erro real do trigger de auditoria
  desfaz criação/edição e idempotência. Nenhum resultado mockado aprova segurança.
- AC09/10: formulários reais por teclado, ausência de overflow nas duas larguras,
  erro de duplicata preserva campos, estados reais de envio/sucesso/vazio;
  migrations do zero e verificações acima aprovadas.

## Limites e continuação

Dados e destinatários fictícios, JWTs emitidos pelo Auth local e SQL de operador
restrito a setup/inspeção/falha controlada; provas de acesso usam sessões comuns.
Sem migrations remotas, implantação, convites reais, commit ou push nesta etapa.
CI foi configurada para incluir a nova suíte após reset local; execução hospedada
não realizada. Não foram aprovados testes HTTPS remotos, auditoria WCAG completa,
outros browsers, volumes representativos ou migração de dados reais existentes.
Documento não tem validação fiscal externa; produtos/SKU, Storage, versões
comerciais e catálogo seguem pendentes. RF05 continua parcial, F2 não concluída.
Próxima etapa autorizável: F2.B, sem iniciar automaticamente.
