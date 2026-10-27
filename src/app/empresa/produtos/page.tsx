import Link from "next/link";
import { redirect } from "next/navigation";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";
import { findProducts } from "@/modules/products/service";
import { productQuery, productParams } from "@/modules/products/contracts";
export const dynamic = "force-dynamic";
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) {
  const { context } = await pageContext(); if (context.role === "buyer") redirect("/acesso-negado");
  let query; try { query = productQuery(productParams(await searchParams)); } catch {
    return <AccessShell context={context}><h1>Filtros inválidos</h1><p role="alert">Confira a pesquisa e a página informadas.</p><Link prefetch={false} href="/empresa/produtos">Limpar filtros</Link></AccessShell>;
  }
  const { data } = await findProducts(query);
  const url = (page: number) => `/empresa/produtos?${new URLSearchParams({ q: query.search, status: query.status, page: String(page), pageSize: String(query.pageSize) })}`;
  return <AccessShell context={context}><p className="eyebrow">Cadastros</p><h1>Produtos</h1>
    {context.role === "admin" && <Link prefetch={false} className="button" href="/empresa/produtos/novo">Novo produto</Link>}
    <section aria-labelledby="product-search-title"><h2 id="product-search-title">Consultar produtos</h2><form method="get" action="/empresa/produtos" className="stack">
      <div className="field"><label htmlFor="q">Buscar por nome ou SKU</label><input id="q" name="q" maxLength={100} defaultValue={query.search} /></div>
      {context.role === "admin" && <div className="field"><label htmlFor="status">Situação</label><select id="status" name="status" defaultValue={query.status}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></div>}
      <button className="button">Buscar produtos</button></form></section>
    <section aria-labelledby="products-title"><h2 id="products-title">{data.total} {data.total === 1 ? "produto encontrado" : "produtos encontrados"}</h2>
      {!data.items.length ? <p>Nenhum produto encontrado neste acesso com os filtros atuais.</p> : <ul className="admin-list">{data.items.map(product => <li className="admin-item" key={product.id}><div>
        <strong><Link prefetch={false} href={`/empresa/produtos/${product.id}`}>{product.name}</Link></strong><p>{product.sku} · {product.salesUnit}</p><span className="status">{product.active ? "Ativo" : "Inativo"}</span>
      </div></li>)}</ul>}
      <nav className="pagination" aria-label="Paginação de produtos">{data.page > 0 && <Link prefetch={false} href={url(data.page-1)}>Página anterior</Link>}<span>Página {data.page+1}</span>{(data.page+1)*data.pageSize < data.total && <Link prefetch={false} href={url(data.page+1)}>Próxima página</Link>}</nav>
    </section>
  </AccessShell>;
}
