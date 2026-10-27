import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { ProductEditor } from "@/components/products/editor";
import { ProductPhoto, PhotoEditor } from "@/components/products/photo";
import { pageContext } from "@/modules/identity/session";
import { findProduct } from "@/modules/products/service";
import { ProductProblem } from "@/modules/products/contracts";
export const dynamic = "force-dynamic";
export default async function ProductPage({ params,searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string; foto?: string }> }) {
  const { context } = await pageContext(); if (context.role === "buyer") redirect("/acesso-negado");
  const result = await findProduct((await params).id).catch(error => { if (error instanceof ProductProblem && ["ACCESS_DENIED","VALIDATION_ERROR"].includes(error.code)) return null; throw error; });
  if (!result) return <AccessShell context={context}><h1>Produto indisponível</h1><p role="alert">Este produto não está disponível no seu acesso atual.</p><Link prefetch={false} href="/empresa/produtos">Voltar para a lista</Link></AccessShell>;
  const product = result.data, query = await searchParams;
  const messages: Record<string,string> = { salva: "Foto atualizada com sucesso.", removida: "Foto removida com sucesso.", limpa: "Fotos não utilizadas foram limpas. Envios em andamento são preservados.", pendente: "A foto foi atualizada. Há arquivos não utilizados pendentes de limpeza; você pode tentar limpar novamente." };
  return <AccessShell context={context}><p className="eyebrow">Produtos</p><h1>{product.name}</h1><Link prefetch={false} href="/empresa/produtos">Voltar para a lista</Link>
    {query.salvo === "1" && <p role="status" className="notice">Produto salvo com sucesso.</p>}{query.foto && messages[query.foto] && <p role="status" className="notice">{messages[query.foto]}</p>}
    <section><h2>Dados do produto</h2><dl className="data-grid">
      <div><dt>SKU</dt><dd>{product.sku}</dd></div><div><dt>Situação</dt><dd>{product.active ? "Ativo" : "Inativo"}</dd></div>
      <div><dt>Categoria</dt><dd>{product.category || "Não informada"}</dd></div><div><dt>Unidade de venda</dt><dd>{product.salesUnit}</dd></div>
      <div><dt>Conteúdo da embalagem</dt><dd>{product.packageContent || "Não informado"}</dd></div><div><dt>Quantidade mínima</dt><dd>{product.minQuantity}</dd></div><div><dt>Múltiplo de venda</dt><dd>{product.quantityMultiple}</dd></div>
    </dl><p>{product.description || "Sem descrição."}</p></section>
    {context.role === "admin" && <section><h2>Editar produto</h2><ProductEditor product={product} requestKey={randomUUID()} /></section>}
    <section><h2>Foto</h2>{product.hasPhoto ? <ProductPhoto id={product.id} name={product.name} revision={product.revision} /> : <p>Este produto ainda não tem foto.</p>}
      {context.role === "admin" && <PhotoEditor id={product.id} revision={product.revision} hasPhoto={product.hasPhoto} requestKey={randomUUID()} />}</section>
  </AccessShell>;
}
