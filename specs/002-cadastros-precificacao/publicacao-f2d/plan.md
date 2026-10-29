# Plano de publicação F2.D

1. Conferir destinos, instruções e evidências; repetir check e revisão de segredos.
2. Histórico/metadados remoto e dry-run somente da migration 20261028000000.
3. Commit F2.D; db push vinculado sem seed/roles/Vault, conferir grants/RLS/RPCs.
4. Push fast-forward para main, acompanhar CI e deployment Git automático.
5. Smoke HTTPS/Chromium anônimo, registrar resultados e limites, publicar registro
   documental. Abrir branch F3.A e especificar o recorte antes de alterar código.

Fontes oficiais conferidas em 29/10/2026:
[Supabase db push](https://supabase.com/docs/reference/cli/supabase-db-push),
[Vercel deploy](https://vercel.com/docs/cli/deploy). CLI Supabase2.122.0,
Vercel59.11.7; runtime Node24.22.1/npm11.11.1 mantido.
