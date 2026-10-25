# 09 — Plano de validação

## Estratégia

Unidade para cálculos/transições; integração real com banco local/staging para constraints, RPC, RLS, concorrência e idempotência; E2E para login, perfis e jornadas. Seeds fictícios repetíveis, sem copiar produção. Não mockar a autorização nos testes que devem prová-la.

## Matriz mínima rastreável

| Caso | Requisitos | Cenário e resultado esperado |
| --- | --- | --- |
| T01 | RF01/RF02 | Login válido abre contexto correto; inválido apresenta mensagem genérica |
| T02 | RF02/RS01 | Usuário multi-vínculo troca contexto sem dados residuais |
| T03 | RS01/RS07 | Admin A não lê/edita B via UI, HTTP, RPC, dados, relatório ou arquivo |
| T04 | RS02/RS04 | Buyer A1 não consulta A2 nem comissões/campos internos |
| T05 | RS02/RS03 | Seller acessa só carteira e não executa baixa diretamente |
| T06 | RS06 | Revogar vínculo bloqueia operação seguinte com token ainda válido |
| T07 | RF04/RN04 | Dois admins tentam desativar um ao outro; sobra um admin ativo |
| T08 | RF07/RN07–13 | Preço vigente correto; sem preço bloqueia; preço alterado exige revisão |
| T09 | RF09/RN12 | Zero, negativo, fração, múltiplo inválido e mais de 200 linhas são recusados |
| T10 | RF10/RN17 | Confirmar duas vezes gera um conjunto de parcelas e um snapshot |
| T11 | RF11/RN21 | R$ 100 em 3 parcelas fecha em 33,33 + 33,33 + 33,34 |
| T12 | RF12/RN23–25 | Recebimento parcial reduz saldo; excedente é recusado |
| T13 | RS05/RN39 | Repetir baixa após timeout não duplica; mesma chave/payload diferente dá conflito |
| T14 | RN24 | Duas baixas concorrentes de 80 sobre saldo 100: apenas uma aceita |
| T15 | RF13/RN26 | Recibo corresponde ao fato; falha ao renderizar permite regerar sem nova baixa |
| T16 | RF14/RN31–32 | 200 a 5%; receber 50 libera 2,50; receber 150 libera 7,50 |
| T17 | RN31–32 | Comissão total de 0,01 e baixas pequenas nunca excedem o total; quitação fecha residual |
| T18 | RF14/RN34 | Dois pagamentos tentam consumir mesmo ganho; apenas um aceita |
| T19 | RN27/RN35 | Comissão paga bloqueia estorno da baixa; reverter pagamento libera fluxo permitido |
| T20 | RN36 | Reversão repetida não duplica; ganho pode ser pago novamente após reversão válida |
| T21 | RF16/RN28 | Extrato do comprador coincide com os títulos do fornecedor |
| T22 | RF15/RN37–38 | Totais por período/data batem com ledger; CSV não executa fórmulas |
| T23 | RNF01/UX | Jornada de pedido e baixa em 360/390/768/1024/1440 sem corte de conteúdo |
| T24 | RNF02/UX | Login, carrinho e baixa utilizáveis só por teclado; foco/labels/contraste verificados |
| T25 | RS03/RS08 | DML direto autenticado nas tabelas críticas é negado |
| T26 | RS01/RN01 | FK impede produto/cliente/título de outro tenant em pedido ou recebimento |
| T27 | RS07 | Logout/troca de tenant não reaproveita conteúdo privado em cache |
| T28 | RF04/RF03 | Convite/provisionamento repetido não duplica tenant/vínculo; falha é reconciliável |
| T29 | RN18/RN24 | Cancelamento concorrente com baixa mantém saldo e estados consistentes |
| T31 | RN27/RN32 | Estorno de recebimento antigo com posterior efetivo é bloqueado; estorno do último recompõe ganho cumulativo exato |
| T32 | RN24/RN32 | Baixas concorrentes em parcelas diferentes do mesmo pedido serializam a apuração e fecham o ganho acumulado |
| T30 | RN08/RN30 | Versões/atribuições sobrepostas são recusadas e mudança futura preserva snapshot |

## Cenário de aceite em linguagem de negócio

```gherkin
Dado que o cliente Padaria Central está vinculado ao fornecedor A
E o produto Coxinha é vendido por R$ 2,00 com mínimo de 10 unidades
Quando o comprador envia um pedido de 100 unidades
Então o pedido fica aguardando confirmação e totaliza R$ 200,00
Quando o fornecedor confirma em duas parcelas iguais
Então existem dois títulos de R$ 100,00 para o mesmo cliente
Quando o administrador registra recebimento de R$ 50,00
Então o saldo agregado é R$ 150,00 nos dois portais
E a comissão a 5% liberada é R$ 2,50
E nenhum usuário do fornecedor B acessa esses registros
```

## Critério de conclusão por fase

Build e tipos sem erros, lint conforme configuração, testes pertinentes aprovados, migrations reproduzíveis e critérios cobertos. Guardar comandos, versões, ambiente e resultados em `specs/<feature>/tasks.md`. Performance só pode ser declarada atendida após medição com ambiente e dataset registrados. Falhas e testes não executados ficam explícitos.
