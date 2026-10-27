# Tarefas e evidências F2.B

- [x] B.1 Inspecionar e especificar produtos/SKU/foto privada.
- [x] B.2 Migration/RPC/RLS/Storage.
- [x] B.3 Casos de uso, interfaces e validação real de foto.
- [x] B.4 Provar isolamento/repetição/concorrência/auditoria/Storage reais.
- [x] B.5 Lint/tipos/unidade/build, SQL e regressões pertinentes.
- [x] B.6 Documentar evidências, limites e encerrar serviços locais.

Concluída localmente em 27/10/2026. Nenhum aceite depende de mocks ou teste ausente.

## Resultados confirmados em 27/10/2026

Base 4403916 e branch feat/002-products-sku, sem alterar ambiente publicado.
Sharp 0.35.5 foi declarado diretamente, preservando versão já transitiva; registry
oficial informa Node >=20.9, compatível com Node 24.22.1/npm 11.11.1 utilizados.
npm install: zero vulnerabilidades. Demais patches e credenciais preservados.

| Comando real | Resultado |
| --- | --- |
| `supabase start --network-id meuatacado-local` (stdout oculto) | Stack Docker disponível, sem expor chaves |
| `supabase db reset --local --network-id meuatacado-local` | Cinco migrations aplicadas do zero, incluindo 20261027010000 |
| `supabase db lint --local --schema public,private --level warning --fail-on warning --network-id meuatacado-local` | Sem erros/avisos de schema |
| `supabase test db --network-id meuatacado-local` | 7 pgTAP aprovados |
| `npm run check` | ESLint sem warnings, tipos estritos, 41 unitários em 7 arquivos e build Next aprovados |
| `npm run test:products` | 14/14 aprovados, 7 cenários por largura 360/1440; Auth, banco e Storage reais, app sem chave elevada/SMTP |
| `npm run test:identity` | 23 grupos aprovados, incluindo nove tabelas FORCE RLS e 26 RPCs de executor dedicado |
| `npm run test:auth` | 8 cenários aprovados em 360/1440, incluindo recuperação e troca de contexto |
| `npm run test:customers` | 12 cenários aprovados em 360/1440, carteira/cliente/revisão/grants preservados |
| `npm run test:admin` | 10 cenários aprovados em 360/1440, incluindo envio SMTP/Mailpit e falhas reais |
| `npm run test:products -- --grep 'admin cadastra e edita'` | 2 cenários aprovados com foco Tab e envio Enter nas duas larguras |
| `npm run test:products -- --grep 'foto real\|upload recusa'` | 4 cenários afetados aprovados novamente após a validação de assinatura dos bytes |
| `npm run test:e2e` | 5 cenários públicos aprovados em 360/390/768/1024/1440 |
| `git diff --check` | Sem erros de whitespace |
| Reset local + db lint/pgTAP repetidos ao final | Cinco migrations novamente aplicadas do zero, fixtures removidas e SQL aprovado |
| `supabase stop` + docker ps/lsof | Stack local encerrada com volumes preservados; nenhum serviço do projeto/dev server ativo |

Npm executado com `PATH=/private/tmp/meuatacado-f0-runtime/node_modules/.bin:$PATH`;
binário Supabase do node_modules. Contadores temporários de Auth isolados entre
rodadas com `docker restart supabase_auth_meuatacado-local`, sem mudar limites.

## Evidência do aceite B01–B06

UI real cria/edita produto e preserva campos após SKU duplicado; seller lê só
ativos e não escreve, buyer/outro tenant negados e UID com admin+seller limitado
pelo vínculo selecionado. Duas criações equivalentes têm um vencedor; replay
concorrente retorna o mesmo fato e auditoria; payload alterado conflita. Mesma
revisão tem um vencedor e replay da edição mantém resultado anterior. Falha
injetada de auditoria desfaz criação/chave; falha na troca da foto conserva a
anterior. JWTs comuns provam DML/SELECT direto negados, RPC anon negada, buscas
literais/páginas/totais isolados e referência de foto estrangeira recusada.

JPEG real com EXIF é enviado pelo formulário, servido como WebP privado sem
metadados, substituído e removido; proxy usa no-store/nosniff. Bytes inválidos,
MIME divergente e excesso de tamanho são recusados antes de reservar arquivo.
Unidade cobre animação/pixels excessivos, formatos e dimensões. Storage real
nega caminho sem reserva, seller/outro tenant gravando, assinatura/upload
assinado, overwrite/copy/listagem; revogação com mesmo JWT e produto inativo
cortam leitura, reativação a restaura. Expiração e revisão stale impedem ativar.
Uma restrição real temporária de INSERT no Storage comprova falha recuperável;
limpeza explícita retoma sem apagar foto ativa. Bytes forjados sob MIME WebP via
Storage direto não são servidos pelo proxy do app. Sem bypass para aprovar acesso.

Falhas intermediárias de teste corrigidas: seletor parcial SKU encontrava o campo
de busca da página anterior antes de completar navegação; usado label iniciado
em SKU. Diagnóstico temporário de DOM disputava redirecionamento completo e foi
removido. Anunciador do Next com role alert confundia mensagens; asserts escopados
ao main. Fixture SQL de paginação precisava SKU em maiúsculas e consulta seller
precisava buscar explicitamente o item depois de criar >20 registros. Formulários
ficam desabilitados até hidratar, protegendo os valores controlados. Nenhuma
regra de domínio ou controle de acesso foi afrouxado para fazer testes passarem.

Validação de arquivos reforçada com assinatura JPEG/PNG/WebP antes do
decodificador, rejeitando SVG sem sequer chamar esse parser; arquivo vazio tem
erro de formato. Unidade inclui esse caso. As quatro integrações afetadas
passaram novamente no build final; as demais provas de autorização/transação
continuam válidas porque não tiveram mudança de comportamento. No total,
49 cenários E2E distintos passaram, além das repetições dirigidas e 41 unitários,
23 verificações de identidade e 7 pgTAP. Aviso herdado NO_COLOR/FORCE_COLOR no
runner público não causou falha.

## Limites e continuação

Dados/destinatários fictícios e sessão/JWT reais locais. SQL de operador usado
somente em setup, inspeção e falhas controladas; triggers/policies temporários
foram removidos em finally. Arquivos validados/recodificados sem metadados;
direto no Storage um admin pode forjar bytes sob MIME permitido, e o proxy do
app os recusa. A aprovação não representa antivírus, auditoria WCAG completa,
outros browsers, carga real ou recuperação de Storage ensaiada.

CI inclui test:products após reset, mas não foi executada no GitHub para este
incremento. Não houve commit, push, deploy, migration/configuração remota,
convite real ou criação de tenant/admin remoto. .env.local preservado. Site
publicado permanece em 4403916. Alterações estão na branch feat/002-products-sku.
Fotos e banco não são transação distribuída: arquivos aposentados/incompletos
podem exigir limpeza explícita, já implementada e testada. Não excluir bytes
manualmente por SQL. Não há preço/custo/comissão no DTO de produto.

F2.B encerrada. Próxima etapa F2.C (versões e atribuições comerciais), sem
iniciar automaticamente. Configurações iniciais continuam adiadas conforme
pedido do responsável.
