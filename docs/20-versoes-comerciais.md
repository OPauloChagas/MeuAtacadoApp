# 20 — Versões e atribuições comerciais (F2.C)

Incremento validado localmente em 27/10/2026, preservando a F2.B. Publicação
posteriormente autorizada no mesmo dia; evidências em
specs/002-cadastros-precificacao/publicacao-f2bc/tasks.md. Spec/plano/aceite em
specs/002-cadastros-precificacao/comercial/. Primeiro tenant/admin e SMTP não
configurados. Catálogo/cotação F2.D foi implementado e validado localmente em
28–29/10/2026 e publicada em 29/10/2026; detalhes e limites em docs/21. O restante deste
guia descreve o recorte F2.C preservado.

## Comportamento

Admin gerencia tabelas de preço e comissão, cria/edita rascunhos com período,
configura valores por produto e publica. Só preço exige ao menos um item;
comissão tem percentual padrão explícito (inclusive zero) e exceções opcionais.
Produto inativo não pode receber novo valor nem constar de uma nova publicação.
Tabela inativa pode ter rascunho preparado, mas não pode ser publicada/atribuída
para novo uso. Desativação conserva versões, itens e atribuições anteriores.

Publicado é imutável: nenhum item, percentual, preço, data ou estado pode ser
editado ou apagado. Não há encerramento silencioso de uma versão sem fim.
Planeje janelas finitas ou crie nova tabela e atribua explicitamente para mudar
condições. Números de versões são do contador do banco, sob lock e transação;
não dependem de MAX no navegador ou de horário da instância web.

Datas agendadas são meia-noite do fuso cadastrado do tenant. Início vazio é o
instante do banco ao publicar/atribuir; fim é exclusivo e opcional. Duas janelas
adjacentes são aceitas; interseção é recusada por exclusão GiST, inclusive em
concorrência. Timezone do aparelho não muda a vigência. Publicação valida fim
posterior ao início efetivo; rascunho ainda não concede preço.
Calendário limitado a 1900–9999 também no RPC; infinity e datas fora dessa faixa
são recusadas antes de persistir ou serializar respostas para o navegador.

Condições de pagamento têm 1–12 parcelas, primeiro prazo 0–365 dias e intervalo
zero para parcela única ou 1–365 para múltiplas. Cadastro é revisado/auditado;
nenhuma parcela ou data financeira é gerada agora. Primeiro prazo será sugestão
na futura confirmação, que guardará snapshot. Não operar financeiro nesta tela.

Cliente ativo recebe tabela/condição ativas do próprio fornecedor, ou fica sem
atribuição explícita. Sem tabela e versão/preço vigente não haverá fallback
genérico. Outra tabela não substitui dados passados de pedidos. A configuração
usa a mesma revisão de customers, impedindo perder alteração de contato/carteira
concorrente. Campo comercial novo não entra no SELECT autenticado nem no DTO
buyer/seller já entregue em F2.A.

Vendedor ativo recebe tabela de comissão ativa por período, sem sobreposição.
Encerramento é explícito, auditado, não retroativo e somente encurta o período.
Fim vazio encerra no relógio do banco ou cancela um agendamento ainda futuro.
Linhas e vínculos históricos permanecem; vendedor referenciado não troca função.
F3 resolverá versão vigente e congelará percentual; F2.C não apura ganhos.

## Precisão e autorização

Preço positivo numeric(18,2) e taxa numeric(7,4), entre 0 e 100. RPC recebe jsonb
para distinguir string decimal de número JSON. Não arredonda excesso de casas
nem aceita NaN/Infinity/expoente. JSON sempre devolve strings, preservando
centavos acima da precisão binária (ex.: 90071992547409.93). UI normaliza e
formata com string/BigInt, sem Number/parseFloat para preço ou taxa. Vírgula ou
ponto são aceitos sem agrupamento de milhar.

Seller/buyer aguardam projeções F2.D e não acessam páginas, opções, versões,
percentuais ou atribuições cruas. Inclusive um UID com admin e seller não pode
usar o vínculo seller para chamar comandos/leitura administrativa. Todas as
tabelas comerciais negam SELECT/DML direto até ao JWT admin. Não há chave
elevada no CRUD; papel executor dedicado não é dono, login ou bypass de RLS.

Migration 20261027020000 cria oito tabelas: price_lists/price_list_versions/
price_list_items, commission_tables/commission_versions/commission_items,
payment_terms e seller_commission_assignments. FKs compostas em todas as
referências de negócio e em customers.price_list_id/payment_term_id. Trigger
protege versão/itens publicados inclusive contra erro de manutenção SQL.
Totais atuais: 17 tabelas de negócio com FORCE RLS e 40 RPCs públicas autorizadas.

Escritas adquirem o lock de tenant compartilhado com F1/F2.A/B antes dos
recursos e revalidam identidade/vínculo. Revisão e idempotência cobrem dados,
contador, auditoria e resposta na mesma transação; replay reautoriza. Nenhum
tenant, ator, número de versão ou total do browser é autoridade. Preços que o
admin cadastra são entradas autorizadas/validadas; futuros pedidos consultarão
valores persistidos, nunca aceitarão preço calculado pelo comprador.

## Interface e contratos

Rotas: /empresa/tabelas-preco, /empresa/tabelas-preco/{id},
/empresa/tabelas-preco/versoes/{id}; equivalentes em /empresa/comissoes;
/empresa/comissoes/atribuicoes, /empresa/condicoes-pagamento e
/empresa/clientes/{id}/condicoes. Menus são contextuais, mas servidor/RPC
autorizam independentemente. Formulários preservam valores em erro e só ficam
interativos após hidratar; sucesso faz navegação completa para revalidar estado.

GET /api/commercial oferece scopes tables/versions/version/terms/customer/
assignments, kind price/commission quando aplicável e UUID seletor. GET
/api/commercial/options oferece recursos price/commission/payment/product/
customer/seller. Validação por allowlist, sem SQL ou nome de tabela arbitrário.
Respostas data/error/requestId, private/no-store. GET não executa mutation.
Listas, itens e seletores usam busca literal e paginação 20 padrão/100 máximo.
Versão pode ter muitos SKUs; edição é individual/paginada, sem carregar tenant
inteiro no browser. Caminho e contexto inválidos não retornam dados de outro ator.

RPCs adicionadas: list_commercial_tables/save_commercial_table,
list_commercial_versions/save_commercial_version/get_commercial_version,
set_commercial_item/publish_commercial_version, list_payment_terms/
save_payment_term, get_customer_commercial/set_customer_commercial,
list_seller_commission_assignments/assign_seller_commission/
end_seller_commission_assignment. Contratos concretos/defaults na migration;
kind é enum de domínio com branches SQL estáticos, não nome de tabela livre.

## Operação e limites

Sem nova dependência: patches/lockfile de F2.B mantidos; compatibilidade oficial
Next 16.4.3/Node >=20.9/React 19 revalidada, usando Node 24.22.1/npm 11.11.1.
btree_gist é extensão PostgreSQL, instalada por migration no ambiente local.

```sh
npm run db:start
npm run db:reset
npm run dev:local
```

Reset apaga somente Docker local. Runner test:commercial recusa projeto remoto,
usa Auth/PostgREST reais, JWTs comuns e app sem chave elevada/SMTP. SQL de operador
serve apenas para fixtures/inspeção/falhas controladas. Sem traces/vídeos/arquivos
persistentes com senhas. Evidências reais nas tarefas; não contar mocks como
aprovação de permissão ou transação. Após testes, encerrar com npm run db:stop.

Não foram aprovados catálogo/cotação buyer, pedidos, snapshots de venda,
geração de parcelas, comissões ganhas/pagas, auditoria WCAG completa, volumes reais
ou outro browser. A publicação posterior verificou CI e smoke HTTPS anônimo;
não há aprovação autenticada hospedada sem atores provisionados. Configurações
iniciais continuam adiadas conforme o responsável.

Fontes oficiais: [numeric PostgreSQL](https://www.postgresql.org/docs/17/datatype-numeric.html),
[ranges/exclusion](https://www.postgresql.org/docs/17/rangetypes.html) e
[RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security),
consultadas em 27/10/2026.
