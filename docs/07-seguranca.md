# 07 — Segurança e isolamento multi-tenant

## Autenticação e contexto

Login por e-mail/senha com Supabase Auth. Usar integração SSR oficial com cookies e validação de identidade no servidor conforme versão adotada. Não usar objeto de sessão não verificado como autorização. Middleware/proxy ajuda no redirecionamento; cada handler/action/RPC continua responsável por autorizar.

Papéis e clientes vêm de memberships no banco. Não conceder permissão por campo `user_metadata`, querystring, header arbitrário ou seleção visual. Mesmo um tenantId guardado no cookie é só uma seleção até ser revalidado.

Convite: admin autorizado → registro de convite → operação Auth Admin no servidor → usuário define senha → vínculo ativado. Supabase Auth e DB não formam uma transação distribuída: convite deve ter estados pending/sent/accepted/failed, idempotência e reconciliação. Falha de envio não pode criar acesso em outro tenant. Usuário já existente recebe vínculo pelo fluxo seguro, sem resetar sua senha. Provisionar primeiro tenant/admin por ferramenta restrita e transação idempotente; sem endpoint público que permita tornar-se admin.

## RLS e grants

Todas as tabelas de negócio têm RLS habilitada por migration. Nenhuma policy de negócio para `anon`. `authenticated` não pode fazer DML direto nessas tabelas. Leituras diretas são permitidas somente onde não expõem colunas sensíveis nem outra precificação; demais leituras via RPC com projeção explícita.

| Grupo | Política mínima de leitura |
| --- | --- |
| Tenant | Vínculo ativo; somente DTO com dados apropriados |
| Membership | Próprios vínculos; admin gerencia/lê do tenant |
| Customers/orders | Admin no tenant; seller na carteira; buyer nos seus clientes |
| Catalog | Vínculo ativo; buyer somente produto disponível e preço aplicável por RPC |
| Price tables | Admin; seller consulta preço por cliente da carteira via RPC; buyer sem acesso direto |
| Receivables/receipts | Admin; buyer nos próprios clientes por projeção; seller sem acesso |
| Commission | Admin; seller apenas próprios ganhos por projeção; buyer sem acesso |
| Audit/idempotency | Escrita interna; admin lê auditoria projetada; idempotência nunca listável pelo cliente |

Em políticas de escrita internas aplicar `USING` e `WITH CHECK` conforme operação. O desenho deve cobrir INSERT, UPDATE, DELETE, funções e referências compostas. Proibir mudar tenant_id de registros existentes.

Políticas que consultam memberships podem gerar recursão. Implementar helpers mínimos em schema privado, sem exposição de listagem, retorno booleano, autorização baseada em auth.uid(), search_path fixo e revisão de grants. Se helper requer elevação para ler vínculos, seu acesso limita-se a essa consulta; não usar como função genérica de SQL. Testar recursão, revogação e tentativas de chamar diretamente helpers.

## RPC transacional

RPC `SECURITY DEFINER` de negócio usa papel dedicado sem bypass de RLS, diferente do dono das tabelas. Revogar EXECUTE de PUBLIC/anon; conceder somente a authenticated para funções públicas aprovadas. Fixar `search_path` seguro e qualificar tabelas/funções. Não aceitar SQL ou nome de tabela arbitrários.

Dentro da transação: resolver auth.uid(), validar vínculo atual e tenant ativo, verificar função/carteira/cliente, travar recursos, validar estado e entradas, aplicar alterações, auditoria e resultado idempotente. Validar a autorização também na repetição idempotente: resultado antigo não pode vazar após revogação.

Chaves secretas/service_role podem contornar RLS; reservar para Auth Admin e manutenção restrita. Nunca usá-las como cliente padrão do backend. Testes exclusivamente com service_role não comprovam isolamento.

## Proteções adicionais

- HTTPS, política de cookies compatível com SSR, sessão e expiração conforme configuração Auth. Não prometer HttpOnly para todos os tokens sem validar o fluxo oficial adotado.
- Rate limit persistente para login, recuperação, convites, submissão e exportação; parâmetros iniciais documentados e ajustados por carga. Limite em memória de função não atende múltiplas instâncias.
- Proteção de origem/CSRF em mutations baseadas em cookies, sem mutação por GET. Redirecionamento pós-login somente para destinos internos permitidos.
- Storage com bucket privado, políticas por tenant e verificação do vínculo; nome de pasta sozinho não autoriza. URLs assinadas curtas após autorização; não persistir URLs assinadas como dado canônico.
- Upload de foto: limite proposto 5 MB, JPEG/PNG/WebP, validar MIME e conteúdo, não aceitar SVG ativo, remover metadados desnecessários.

F2.B concretiza fotos com teto inicial de 3 MB para o transporte da Vercel,
assinatura de bytes antes do decodificador, recodificação sem metadados e proxy
privado/no-store com autorização a cada leitura. Helpers de operação do Storage
negam assinatura de URLs e acesso público; somente upload reservado, download
autenticado e remoção de aposentadas são permitidos. Detalhes/limites na ADR-016
e docs/19; não estender essa aprovação a arquivos/recibos de fases futuras.

- Recibos gerados sob autorização, sem URL pública estática. Revalidar ao baixar; não expor relatório por UUID adivinhável ou conhecido.
- CSV com escape de células iniciadas por =, +, -, @ para evitar execução de fórmula.
- Logs sem documentos completos, tokens, senha, cookies, chaves ou payloads financeiros integrais. Auditoria guarda campos mínimos necessários à rastreabilidade.
- Dados pessoais mínimos, acesso e retenção documentados antes do piloto. Este pacote não fixa prazos legais de retenção.

## Prova mínima de isolamento

F2.D local acrescenta três RPCs de catálogo/cotação/foto (43 públicas no total),
com snapshot STABLE e DTOs explícitos por cliente/vínculo. Reader selado recebe
somente colunas necessárias aos helpers booleanos; authenticated continua sem
acesso cru comercial. Foto buyer exige preço vigente visível e JWT atual,
inclusive no Storage. Assinatura/listagem/escrita permanecem bloqueadas. Header
de vínculo só detecta contexto obsoleto e não concede autorização. Provas reais
e limites em catalogo/tasks.md e docs/21; sem publicação desta migration.

F2.C nega SELECT/DML direto nas oito tabelas comerciais até ao JWT admin.
Somente RPCs autorizadas pelo vínculo admin selecionado projetam esses dados;
campos comerciais de customers não entram nos grants/DTOs anteriores. Datas e
decimais são validados também no banco; replay reautoriza e falha de auditoria
desfaz toda a operação. Projeções buyer/seller são próprias de F2.D, sem abrir
acesso cru a versões ou percentuais. Provas reais locais em comercial/tasks.md.

Dois tenants A/B; admin e seller em cada; dois clientes em A; buyer em cada cliente e um usuário com vínculos em A/B. Testar IDOR via URL, corpo, query, RPC, exportação, Storage e acesso direto de dados. Verificar também contadores, respostas de erro e cache após troca de contexto.

Testar que um vínculo revogado bloqueia imediatamente a próxima operação e que uma tentativa de UPDATE/INSERT direto falha mesmo com JWT legítimo. Não considerar teste de menu suficiente.
