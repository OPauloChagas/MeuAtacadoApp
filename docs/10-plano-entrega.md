# 10 — Plano incremental

F0 foi validada localmente em 24/10/2026; evidências e limitações estão em
`specs/000-bootstrap/tasks.md`. F1 e seguintes não foram iniciadas. A ordem busca
entregar jornadas completas com isolamento antes do financeiro. Cada fase produz
sua própria pasta de spec/plan/tasks usando os templates.

| Fase | Escopo | Requisitos | Saída verificável |
| --- | --- | --- | --- |
| F0 | Bootstrap e ambientes | RNF10 | Projeto sobe, build/lint/tipos, env.example, Supabase local e CI |
| F1 | Identidade e multi-tenancy | RF01–04, RS01–03/06 | Login, primeiro tenant restrito, vínculos, menus, RLS e testes de isolamento |
| F2 | Cadastros e precificação | RF05–08 | Carteira, catálogo, tabelas/versionamento, cliente com preço correto |
| F3 | Pedido completo | RF09–10 | Rascunho, cotação, envio, confirmação e títulos transacionais |
| F4 | Financeiro do admin e comprador | RF11–13/16 | Baixa parcial/total, recibo, extrato e estorno permitido |
| F5 | Comissão | RF14 | Ganhos proporcionais, pagamento e reversão auditados |
| F6 | Dashboards/relatórios | RF15/17/18 | Indicadores conciliados, CSV e impressão/PDF autorizados |
| F7 | Piloto e operação | RNF01–09/RS01–08 | QA responsivo, restauração ensaiada, observabilidade e deploy autorizado |

A geração dos ganhos deve entrar junto com F4 ou ser incluída como subetapa de F5 antes de permitir uso real de baixas. Não operar financeiro real com recebimentos sem a apuração prevista no modelo; F4 isolada é somente staging até F5 concluir.

## Checklist de tarefas

- [x] F0.1 Inspecionar repositório, fixar versões compatíveis e criar projeto.
- [x] F0.2 Configurar variáveis de exemplo, lint, tipos, build e runner de testes.
- [x] F0.3 Criar infraestrutura local de migrations/seeds e CI sem segredos (configurada; execução hospedada pendente).
- [ ] F1.1 Executar a especificação inicial em `specs/001-identidade-multitenancy/`.
- [ ] F2.1 Criar spec de cadastros e testes de carteira/documento/SKU.
- [ ] F2.2 Implementar versões de preços e comissão, vigência e atribuições.
- [ ] F2.3 Validar catálogo buyer sem acesso a tabelas ou colunas internas.
- [ ] F3.1 Implementar rascunho, cotação, envio e recuperação de falha.
- [ ] F3.2 Implementar confirmação, parcelas, snapshots e estados.
- [ ] F3.3 Provar idempotência e concorrência do pedido.
- [ ] F4.1 Implementar extratos e saldo único nos dois portais.
- [ ] F4.2 Implementar baixa, recibos e estorno em transação.
- [ ] F5.1 Integrar ganhos proporcionais às baixas e suas reversões.
- [ ] F5.2 Implementar pagamento/reversão de comissão e testes concorrentes.
- [ ] F6.1 Implementar dashboards por função, relatórios e exportações.
- [ ] F7.1 Medir desempenho e corrigir gargalos demonstrados.
- [ ] F7.2 Validar fluxos nos tamanhos e navegadores definidos.
- [ ] F7.3 Ensaio de restauração, autorização de implantação e smoke test.

## Definição de pronto para o MVP

Comprador autorizado faz pedido no celular; fornecedor confirma; títulos aparecem nos dois portais; admin registra recebimento; saldo, recibo e comissão ficam coerentes; comissão paga é rastreável; outros clientes/tenants não acessam nada. Validações de negócio pendentes resolvidas antes do piloto. Nenhum botão simula integração inexistente.

## Depois do MVP

Estoque e produção, Pix/boleto, importação de planilha, entrega, notificações, PWA/offline, fiscal, múltiplas unidades, descontos/frete, devoluções e crédito. Criar especificação própria para cada expansão, sobretudo as que alteram total/base financeira.
