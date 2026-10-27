# Plano de publicação F2.B/C

1. Preservar/revisar workspace e histórico publicado; confirmar destinos e
   instruções; repetir npm run check e revisar exclusões de segredos.
2. Consultar metadados e histórico remotos; dry-run das migrations usando senha
   somente no ambiente da ferramenta. Revisar escopo incremental antes de aplicar.
3. Commit das implementações e registro de autorização/validação. Aplicar somente
   as duas migrations pendentes, sem seed/roles/Vault, e conferir metadados.
4. Push fast-forward para main; acompanhar deployment automático/CI. Publicar
   via CLI apenas se a integração Git não produzir o deployment necessário.
5. Smoke HTTPS/Chromium anônimo com chave pública, sem criar atores remotos.
   Registrar limites; commit documental, push e conferir publicação final.

Fontes oficiais reconsultadas em 27/10/2026:
[Supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push),
[Vercel deploy](https://vercel.com/docs/cli/deploy). Opções verificadas no help
Supabase 2.122.0/Vercel 59.11.7; Node 24.22.1/npm 11.11.1.
