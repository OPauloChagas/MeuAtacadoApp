# F2.B — Produtos, SKU e foto privada

Status: implementada e validada localmente em 27/10/2026. Base 4403916 preservada.
RF06, RN01–03/12/39–40, P06/P14, RS01–03/05–08 e UX01–05 aplicáveis.
Não iniciar F2.C/D, pedidos ou financeiro; configurações iniciais ficam para depois.

Admin cria/edita/desativa/reativa produto do tenant selecionado. Seller consulta
somente produtos ativos do tenant, sem escrita. Buyer não recebe catálogo neste
incremento: disponibilidade/preço aplicável será implementada em F2.D. Um UID
também admin não ganha escrita escolhendo vínculo seller.

Campos: SKU 1–64 ASCII letras/números/ponto/hífen/barra/underscore, iniciado por
letra/número, normalizado por trim/maiúsculas e único por tenant; nome 1–200,
descrição até 2000, categoria textual até 100, unidade comercial 1–32, conteúdo
da embalagem textual até 160, mínimo e múltiplo inteiros 1–1000000, ativo.
Categoria é rótulo do produto, sem cadastro de taxonomias separado. Quantidade
futura deve ser >= mínimo e divisível pelo múltiplo; sem conversão de estoque.
Não há exclusão nem campos de preço/custo/comissão.

Listas têm busca literal, filtro ativo/inativo/todos para admin, paginação 20
padrão/100 máximo e total somente autorizado. RPCs projetam campos explícitos;
nenhum SELECT ou DML direto de products/product_photos por authenticated.
Escritas exigem revisão/idempotência/auditoria e lock de tenant compartilhado
com F1/F2.A, depois lock do produto. Replay reautoriza.

Foto opcional: uma ativa por produto. App aceita JPEG/PNG/WebP até 3 MB (3000000 bytes),
confere formato real, uma página, até 16 milhões de pixels, orienta/redimensiona
até 1600x1600 e recodifica WebP sem metadados. Rejeita SVG/animação/conteúdo
incompatível. Bucket privado aceita somente WebP até 3 MB (3000000 bytes). App nunca usa chave
elevada: Storage usa JWT normal do ator e policies por reserva/tenant/função.

Reserva autorizada gera caminho UUID, validade de 15 minutos, uma pendente por
produto. Upload sem sobrescrita; ativação transacional exige objeto existente,
metadados de MIME/tamanho compatíveis e revisão esperada. Troca/remoção aposenta
foto anterior antes da limpeza de bytes. DB e Storage não são transação única:
falhas deixam arquivo pendente/aposentado inacessível aos leitores comuns e
permitem limpeza explícita pelo admin. Não apagar bytes por SQL.

Leitura pelo app passa por /api/products/{id}/photo, revalida contexto e produto
e recodifica o arquivo: conteúdo forjado via Storage direto não é servido pelo
app. Resposta privada no-store, image/webp/nosniff, sem URL pública/assinada
persistida ou cache de otimização compartilhado. Policies também protegem acesso
direto ao Storage: seller somente foto ativa de produto ativo, buyer/anon negados.
Admin pode limpar pendências/aposentados do próprio produto explicitamente.

## Aceite

B01. Admin cria/edita e bloqueia/reativa produto; SKU equivalente conflita no
tenant inclusive em concorrência, e mesmo SKU em outro tenant é permitido.
B02. Seller somente lê ativos; buyer/anon/outro tenant e contexto adulterado não
leem/escrevem via página, HTTP, RPC, Data API ou Storage. Revogação corta acesso.
B03. Revisão concorrente tem um vencedor; repetição não duplica fato/auditoria;
payload diferente conflita; falha de auditoria desfaz mutation e idempotência.
B04. Foto real sobe, pode ser substituída/removida, é privada e não tem EXIF.
Arquivo falso/SVG/MIME divergente/grande/pixels excessivos é recusado. Caminho
sem reserva, overwrite, outro tenant e seller escrevendo Storage são negados.
B05. Falha/concorrência entre upload e ativação não publica foto incorreta;
objeto aposentado/expirado não é acessível pelo seller; limpeza é recuperável.
B06. UI pt-BR, teclado e 360/1440, campos preservados em erro, loading/vazio/
erro/sucesso; migrations do zero, SQL, unidade/build e integrações reais registradas.
