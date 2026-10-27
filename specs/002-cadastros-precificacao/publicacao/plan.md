# Plano de publicação

1. Revisar diferenças, exclusões de segredos e verificações locais existentes.
2. Consultar projetos/configuração e estado do banco remoto, revisar dry-run.
3. Registrar configuração Auth mínima em diretório temporário isolado e revisar
   config diff. Não enviar o config.toml local completo ao serviço remoto.
4. Criar commit das implementações F1/F2.A e documentação de publicação.
5. Aplicar somente migrations pendentes no projeto confirmado, sem seed/reset;
   conferir histórico, RLS/grants/papéis/RPCs por consultas de metadados.
6. Configurar Auth e variáveis da Vercel, sem SMTP/admin key indisponíveis.
   Template bloqueado pelo provedor Free: remover somente essa personalização,
   manter demais opções e desabilitar recuperação no servidor/UI por configuração.
   Verificar regra de disponibilidade em unidade e regressão Auth real local.
7. Push fast-forward em main, observar build Git e validar deployment/HTTPS.
8. Registrar resultados reais em commit documental e confirmar push/publicação
   final. Não afirmar testes autenticados remotos se não houver atores criados.

Fontes oficiais verificadas em 27/10/2026:
[Supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push),
[Auth config](https://supabase.com/docs/reference/api/v1-update-auth-service-config),
[variáveis Vercel](https://vercel.com/docs/cli/env) e
[deploy Vercel](https://vercel.com/docs/cli/deploy). Flags concretas conferidas
no help da CLI instalada; runtime Node 24.22.1.
