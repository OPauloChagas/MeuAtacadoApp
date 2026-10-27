# Plano — Integração de plataformas

1. Ler instruções/arquitetura/segurança/operação; consultar documentação oficial
   e conexões disponíveis sem solicitar credenciais no chat.
2. Inspecionar autenticação e projetos Vercel; vincular o projeto existente deste
   app. Corrigir o preset remoto Other para Next.js e versionar os comandos em
   vercel.json. O vínculo e a atualização das configurações não publicam o app.
3. Identificar e autenticar o Supabase por conexão autorizada ou CLI oficial;
   verificar a organização e disponibilidade de um projeto gratuito de
   desenvolvimento/homologação. Região proposta: São Paulo (`sa-east-1`), se
   disponível. Não provisionar recurso pago sem autorização. Não coletar
   senhas/tokens pelo chat.
4. Inspecionar nomes/escopos das variáveis existentes sem revelar valores;
   configurar apenas NEXT_PUBLIC_SUPABASE_URL e
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local e Vercel Development/Preview.
   Não compartilhar o Supabase de desenvolvimento com o destino Production.
5. Validar configuração e conexão somente por leitura; documentar o resultado.
   Migrations remotas continuam fora do escopo.
6. Pelo pedido explícito posterior de commit/push/deploy, revisar arquivos e
   ignores, executar lint/tipos/unidade/build/E2E, criar o commit inicial em main
   e enviar ao GitHub. Acompanhar o deployment automático para evitar duplicação;
   usar deploy de produção pelo CLI se o Git não disparar uma publicação válida.
7. Verificar estado Ready, URL, HTTP e conteúdo publicado; registrar evidências
   e manter a pendência Supabase. Nenhuma migration remota nesta etapa.

## Fontes consultadas em 24/10/2026

- https://vercel.com/docs/cli/link
- https://vercel.com/docs/cli/project
- https://vercel.com/docs/cli/env
- https://supabase.com/docs/guides/local-development/cli-workflows
- https://supabase.com/docs/guides/integrations/vercel-marketplace

Preferir as contas existentes. Não usar Marketplace para provisionar recursos
adicionais ou alterar cobrança sem solicitação. As fábricas Auth SSR e regras
de autorização do aplicativo continuam na especificação 001.
