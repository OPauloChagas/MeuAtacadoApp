# Plano F2.B

1. Revisar instruções/modelo existente, preservar base publicada e isolar branch
   feat/002-products-sku. Verificar versões oficiais e fixar sharp 0.35.5 (já
   transitivo do Next), Node >=20.9 compatível com Node 24.22.1.
2. Migration incremental: products, product_photos, bucket privado e policies;
   helper booleano restrito do leitor, executor dedicado/RLS, RPCs de cadastro,
   reserva/ativação/aposentadoria e limpeza sem bypass.
3. Módulo products com validação/DTOs, casos de uso, processamento de imagens,
   rotas GET privadas e operações POST específicas, menu e telas admin/seller.
   Upload por Route Handler autenticado/origem validada (não aumentar limite
   global de Server Actions); limite de payload e de imagem no servidor.
4. Suíte Playwright com Auth/PostgREST/Storage Docker reais e JWTs comuns,
   cenários positivos/negativos/replay/concorrência/falha de auditoria/arquivos.
5. Check web, SQL/pgTAP, regressões pertinentes e evidências. Encerrar Docker.
   Sem commit/push/deploy/migration remota automática nesta etapa.

Fontes consultadas em 27/10/2026: registry npm sharp 0.35.5 (Node >=20.9),
[Storage RLS](https://supabase.com/docs/guides/storage/security/access-control),
[upload padrão](https://supabase.com/docs/guides/storage/uploads/standard-uploads),
[saída/remoção de metadados sharp](https://sharp.pixelplumbing.com/api-output/).
Demais versões exatas do lockfile preservadas; novas verificações documentadas.
