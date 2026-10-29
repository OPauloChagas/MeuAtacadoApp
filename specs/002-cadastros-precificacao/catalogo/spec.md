# F2.D — Catálogo e cotação autorizados

Status: implementada e validada localmente em 28–29/10/2026, sem publicação.
Base publicada cf4d60e preservada.
RF06/07 e preparação de RF09, RN01–03/07–10/12–13, RS01–08, RNF01/02/05/06/08–10.

Buyer consulta catálogo do cliente do vínculo selecionado. Admin consulta cliente
ativo do tenant; seller somente cliente ativo da carteira do vínculo selecionado.
Preço vem exclusivamente da tabela ativa atribuída e versão publicada vigente,
com horário do banco em [início,fim). Sem tabela/versão: catálogo indisponível,
sem fallback. Produto inativo ou sem preço não aparece, inclusive em contadores,
buscas por SKU/nome, filtro literal de categoria ou fotos. Página 20/máximo100.

DTOs explícitos contêm identificação comercial do produto, descrição/unidade/
embalagem/mínimo/múltiplo, foto disponível e preço aplicável como string. Não
expor tabela/versão, outros clientes, comissão/custo, caminhos Storage ou metadados
internos. RPC de foto retorna somente referência opaca de foto/produto; servidor
monta caminho com tenant validado e transmite WebP autenticado/no-store/nosniff.
Storage com JWT comum revalida acesso; assinatura/listagem/escritas buyer negadas.

Simulação transitória de 1–200 linhas: aceitar somente product_id e quantidade
inteira JSON de 1–1000000; consolidar duplicatas e validar limite agregado,
mínimo/múltiplo. Recalcular preço, linha e total com numeric exato no banco,
dinheiro JSON string sem coerção para Number. Limite do total numeric(18,2);
recusar excesso com AMOUNT_LIMIT em vez de arredondar/serializar valor inválido.

Cotação é leitura STABLE com snapshot consistente e relógio statement_timestamp.
Retorna impressão SHA256 das condições/itens e vínculo, sem IDs internos no DTO.
Fingerprint não é autorização nem prova assinada de aceite; F3 revalidará tudo
na submissão. Com token anterior diferente, PRICE_CHANGED HTTP409 traz a nova
cotação para revisão. Sem persistir rascunho/pedido, chave idempotente ou auditoria
de escrita inexistente. Repetição e concorrência de leituras não criam fatos.

UI pt-BR permite escolher quantidades na página e calcular uma simulação; mantém
seleção somente em memória enquanto a página está aberta. Busca/paginação por
navegação completa descarta seleção, com aviso explícito. Troca de contexto e
logout limpam valores; sem localStorage/cookies comerciais/offline. Não prometer
carrinho persistente ou envio de pedido. Estados carregando/vazio/erro/sucesso.
POST inclui X-Atacado-Context com vínculo que originou a seleção; o servidor
compara com o contexto revalidado e recusa aba obsoleta, sem usar o header como
autorização. Documento restaurado por bfcache recarrega para revalidar a sessão.

## Aceite

D01. UI buyer e consulta admin/seller autorizada em 360/1440 por teclado; filtros,
paginação, foto real e simulação com total exato e mensagens de mudança/erro.
D02. Duas tabelas no mesmo tenant e dois tenants projetam só preço do cliente;
ausência, inatividade, versão futura/encerrada/rascunho e fim exclusivo comprovados.
D03. Quantidades/duplicatas/limites e valores grandes exatos; entrada de preço,
tenant ou campo extra rejeitada no HTTP e RPC; token diferente exige revisão.
D04. Revogação, carteira, cliente/tenant/perfil/tabela/produto inativos cortam
próximo acesso com mesmo JWT, inclusive foto. UID admin+seller respeita seleção.
D05. SELECT/DML comercial cru e helpers privados permanecem negados; DTOs não
vazam campos extras; busca/opções/contadores/contexto/cache e Storage isolados.
D06. Leituras repetidas/concorrentes consistentes; mudanças comerciais concorrentes
retornam fotografia antiga ou nova completa, sem misturar preços de versões.
D07. Migrations do zero, check/SQL e regressões reais pertinentes com evidências.

Fora: F3/persistência/envio/confirmação de pedidos, financeiro, novas dependências
antecipadas, primeiro admin/SMTP, commit/push/deploy/migrations remotas nesta execução.
