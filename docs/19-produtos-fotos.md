# 19 — Produtos, SKU e fotos privadas (F2.B)

Incremento validado localmente em 27/10/2026, sobre 4403916. Spec/aceite e
evidências em specs/002-cadastros-precificacao/produtos/. Publicação posteriormente
autorizada junto com F2.C no mesmo dia; evidências em publicacao-f2bc/tasks.md da
mesma spec. Primeiro tenant/admin remoto e configurações iniciais continuam
pendentes para depois do desenvolvimento, conforme o pedido atual.

## Comportamento

Admin cadastra/edita produtos, desativa/reativa e gerencia uma foto opcional.
SKU único por fornecedor, normalizado em maiúsculas/trim; ponto, hífen, barra e
underscore são preservados. Produtos têm nome, descrição, categoria textual,
unidade de venda, conteúdo da embalagem, mínimo e múltiplo inteiros. Não há
conversão de estoque nem preço/custo/comissão. Categoria é rótulo, conforme ADR-016.
Desativação preserva o registro; não existe exclusão de produto.

Seller consulta somente produtos ativos e fotos correspondentes no tenant.
Buyer aguarda catálogo/preço aplicável de F2.D e não acessa essas rotas internas.
Papéis também são limitados pelo vínculo selecionado nas páginas/actions/RPCs;
ter outro vínculo admin não permite escolher seller para escrever.

Rotas: /empresa/produtos, /empresa/produtos/novo e /empresa/produtos/{id}.
Busca literal por nome/SKU, situação e paginação de 20 itens (máximo 100) no
servidor. Totais são autorizados. GET privados /api/products e /api/products/{id}
usam data/error/requestId e no-store. POST /api/products/{id}/photo aceita somente
Origin canônica, sessão/admin revalidados e multipart limitado. GET de foto não
executa escrita. Não aumentar limite global de Server Actions.

## Banco e Storage

Migration 20261027010000: products e product_photos com ENABLE/FORCE RLS,
FKs compostas por tenant, identidade imutável, SKU único, revisão e índices.
Authenticated/anon sem SELECT/DML direto nessas tabelas; RPCs pertencem ao
executor dedicado sem BYPASSRLS/dono de tabela, sob search_path vazio e RLS.
Com as fases anteriores, são nove tabelas e 26 RPCs públicas autorizadas.

| RPC | Função |
| --- | --- |
| list_products / get_product | Projeção admin/seller autorizada; sem dados comerciais futuros |
| create_product / update_product | Admin, revisão/idempotência/auditoria atômica |
| prepare_product_photo | Admin reserva UUID/caminho e checksum; 15 minutos, uma pendente por produto |
| set_product_photo | Admin ativa ou remove; revisão, objeto válido/existente, aposentadoria anterior e auditoria atômicas |
| retire_product_photo | Admin cancela sua reserva ou expira pendências e lista até 100 aposentadas para limpeza |
| finish_product_photo_cleanup | Admin confirma ausência dos objetos e marca purged_at; nunca sobre foto ativa |

Todas mutations de domínio compartilham lock de tenant de F1/F2.A e lock do
produto, reautorizam após espera e antes de replay. Falha de auditoria desfaz
escrita e chave. Preparação e mudança de foto são fatos separados; upload de
bytes não é transação PostgreSQL. Limpeza física é técnica, idempotente e
recuperável; registros de fotos não são excluídos do banco.

Bucket product-photos é privado, somente image/webp até 3000000 bytes. Policies
consultam reserva/ator atual, estado, tenant e produto; caminho isolado não
autoriza. Helpers oficiais de operação restringem upload normal, leitura
autenticada e delete de aposentadas. Assinatura de URLs/download/upload, listagem,
copy/move e overwrite/upsert não recebem política permissiva. Não há chave
elevada no CRUD/Storage; a mesma sessão normal é usada do início ao fim.

App aceita JPEG/PNG/WebP até 3 MB e 16 milhões de pixels, uma página, confere
formato real e MIME, orienta e reduz para até 1600x1600. Sharp recodifica WebP
sem EXIF/XMP, também ao ler pelo proxy: um admin usando o endpoint Storage
direto pode gravar bytes forjados sob MIME permitido, mas o app não os serve
como imagem válida. Não confiar em extensão/Content-Type fornecidos pelo cliente.
App não expõe path em DTO nem persiste URL assinada. Image usa unoptimized para
preservar autorização no proxy privado/no-store/nosniff em toda leitura.

Substituição/remoção aposentam o arquivo anterior na transação antes de tentar
apagar bytes pelo Storage. Falhas podem deixar objetos não utilizados; UI informa
pendência e oferece “Limpar fotos não utilizadas”. Não fazer DELETE SQL de
storage.objects: isso não apaga bytes. Uploads frescos de outro admin são
preservados; pendência expirada pode ser limpa por admin do tenant.

## Dependências e operação

Sharp 0.35.5 estável foi conferido no registry oficial (Node >=20.9) e declarado
diretamente; já era dependência transitiva do Next nessa mesma versão. Node
24.22.1 e demais patches preservados. npm install informou zero vulnerabilidades.
Limite de 3 MB cabe em multipart na função Vercel, dentro do teto proposto de
5 MB do desenho. Ampliar exige outra estratégia de transporte, conforme ADR-016.

```sh
npm run db:start
npm run db:reset
npm run dev:local
```

Reset destrói somente o Docker local. Não executar fixtures em projeto remoto.
Após encerrar dev: npm run check, test:products, test:identity e regressões
descritas nas tarefas, depois npm run db:stop. Runner de produtos recusa endpoint
remoto, injeta apenas URL/chave pública no app e remove chave elevada/SMTP.
Fixtures criam Auths fictícios; provas usam JWTs comuns, Storage/PostgREST reais,
sem mocks ou bypass. Artefatos sensíveis não são persistidos em traces/vídeos.

Fontes oficiais consultadas em 27/10/2026: [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control),
[helpers de operação](https://supabase.com/docs/guides/storage/schema/helper-functions),
[sharp](https://sharp.pixelplumbing.com/api-output/) e
[limites Vercel](https://vercel.com/docs/functions/limitations#request-body-size).

## Limites e continuação

Catálogo buyer, preços/condições e comissões versionadas seguem F2.C/D. Não há
pedidos, financeiro, importação, arquivos históricos de venda ou estoque.
Não se aprovaram CI/HTTPS hospedados deste incremento, outros browsers, auditoria
WCAG ou volumes reais por meio dos testes locais. Fotos não são backup do banco;
objetos exigem recuperação própria. Evidências reais nas tarefas de produtos.
