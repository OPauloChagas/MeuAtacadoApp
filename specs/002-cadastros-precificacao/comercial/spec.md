# F2.C — Versões e atribuições comerciais

Status: implementada e validada localmente em 27/10/2026. Preservada F2.B não commitada;
base publicada 4403916. RF05/07/08, RN01–03/06–08/12–13/29–30/39–40,
RS01–08 e UX01–05 aplicáveis. Configurações iniciais permanecem adiadas.

Admin cria/renomeia/desativa tabelas de preço/comissão; cria e edita rascunhos
de versões, configura preços por SKU ou percentual padrão/exceções e publica.
Published é imutável, inclusive datas e itens. Vigência [início,fim), fim
opcional; sem sobreposição de versões publicadas da mesma tabela. O número da
versão é sequencial do banco, não do browser. Rascunhos não concedem preço.

Início pode ser “ao publicar” (instante do banco) ou data agendada, à meia-noite
no fuso do tenant; fim é data exclusiva nesse mesmo fuso, opcional. Datas são
convertidas no banco, nunca pelo timezone do dispositivo, e limitadas a
1900–9999 também no RPC. Uma versão sem fim
impede outra publicação sobreposta nessa tabela; não será encurtada em silêncio.
Use janelas finitas planejadas ou nova tabela e atribuição explícita para mudar
condições sem editar histórico. Não se introduz encerramento de versão publicada.

Preço positivo numeric(18,2), percentuais numeric(7,4) entre 0 e 100 inclusive.
Entrada e saída JSON são strings decimais; zeros de percentual são explícitos,
sem fallback para ausência de tabela. Rejeitar números JSON, expoente, NaN,
Infinity, excesso de casas e arredondamento implícito. UI aceita vírgula ou
ponto sem separador de milhar e normaliza com BigInt, sem Number para dinheiro.

Condições de pagamento: nome, 1–12 parcelas, primeiro prazo 0–365 dias e
intervalo 0 para parcela única ou 1–365 para múltiplas, ativo e revisão.
Cliente ativo recebe tabela de preço/condição ativas do mesmo tenant, opcionais
para permitir preparação e remoção explícita. Sem tabela atribuída ou versão
vigente não existe preço genérico. Nenhuma parcela é criada nesta etapa.

Vendedor ativo recebe tabela de comissão ativa por período, sem sobreposição
entre atribuições não canceladas. Encerramento explícito auditado exige revisão,
não retroage e só encurta; “encerrar agora” cancela atribuição ainda futura ou
encerra a vigente no relógio do banco. Registros e vínculos históricos permanecem.
Versão vigente e snapshots serão resolvidos na futura confirmação, não aqui.

Somente admin no vínculo selecionado usa as telas/RPCs/endpoints comerciais.
Seller/buyer não leem tabelas, versões, percentuais ou atribuições cruas; suas
projeções de preço/catálogo ficam em F2.D. UID também admin não autoriza uma
chamada escolhendo seller. SELECT/DML direto negado inclusive ao admin JWT.
Tenant, ator, versão e totais nunca vêm do browser como autoridade.

Toda referência de negócio tem FK composta por tenant. FORCE RLS, executor
dedicado sem bypass/dono, lock tenant antes de recursos, revisão, idempotência
e auditoria atômica. Repetição reautoriza. Listas/itens/opções pesquisáveis são
paginados, padrão 20/máximo 100; não carregar o tenant inteiro para um select.
Rascunhos podem ter muitos SKUs; edição de itens individual e paginada.

## Aceite

C01. Admin cria tabelas/rascunhos/itens, edita e publica na UI real em 360/1440
por teclado; erros preservam campos e há estados vazio/envio/erro/sucesso.
C02. Publicado não aceita alteração ou exclusão nem de itens; agendamento,
adjacência, fim aberto e sobreposição real são comprovados inclusive concorrência.
C03. Strings decimais preservam centavos acima da precisão de Number; preço
positivo, percentual 0/100 válidos, entradas inválidas e JSON numérico negados.
C04. Atribuições validam cliente/seller/table/term ativos, papel e tenant; FKs
impedem referências cruzadas, vendedor referenciado não troca função. Encerrar
atribuição preserva histórico; futuras/concorrentes não sobrepõem.
C05. Seller/buyer/anon/outro tenant/metadata/cookie não autorizam leitura/escrita
por UI, HTTP, RPC ou Data API, nem vazam opções/contadores. Revogação corta replay.
C06. Revisão concorrente tem vencedor, chave repetida não duplica fato/evento,
payload divergente conflita, falha de auditoria desfaz fato/contador/chave.
C07. Migrations sobem do zero; check, SQL, JWTs reais e regressões pertinentes
registrados. Sem mocks para aprovar isolamento ou transação.

Excluídos: catálogo/cotação buyer, pedidos, cálculo/apuração/pagamento financeiro,
publicação/migration remota, SMTP e primeiro tenant/admin. Não iniciar F2.D.
