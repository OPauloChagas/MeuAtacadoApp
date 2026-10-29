import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";
import { listCatalog } from "@/modules/catalog/service";
import { message, pageParams, problemCode, query } from "@/modules/catalog/contracts";
import { NativeForm } from "@/components/identity/native-form";
import { CatalogSelection } from "./selection";

export type RawQuery = Promise<Record<string, string | string[] | undefined>>;
export async function CatalogPage({ customer, searchParams }: { customer: string | null; searchParams: RawQuery }) {
  const { context } = await pageContext();
  const path = customer ? `/empresa/clientes/${encodeURIComponent(customer)}/catalogo` : "/cliente/catalogo";
  try {
    const q = query(pageParams(await searchParams));
    const { data } = await listCatalog(customer, q);
    const href = (page: number) => `${path}?${new URLSearchParams({ q: q.search, category: q.category, page: String(page), pageSize: String(q.pageSize) })}`;
    return <AccessShell context={context}><p className="eyebrow">{data.customer.name}</p><h1>Catálogo</h1>
      <p className="intro">Consulte seus preços e simule uma seleção de produtos.</p>
      <p className="notice">A seleção fica somente nesta página. Buscar, paginar, sair ou trocar de acesso descarta as quantidades e a simulação.</p>
      <section><h2>Consultar produtos</h2>
        <NativeForm action={path} method="get" className="stack">
          <div className="form-grid"><div className="field"><label htmlFor="catalog-search">Buscar por nome ou SKU</label><input id="catalog-search" name="q" defaultValue={q.search} maxLength={100} /></div>
            <div className="field"><label htmlFor="catalog-category">Filtrar categoria</label><input id="catalog-category" name="category" defaultValue={q.category} maxLength={100} /></div></div>
          <button className="button">Buscar produtos</button>
        </NativeForm>
        {data.availability === "unavailable" ? <p role="status">{message("PRICING_UNAVAILABLE")}</p>
          : !data.items.length ? <p role="status">Nenhum produto disponível com os filtros atuais.</p>
          : <CatalogSelection key={`${context.membership_id}:${href(q.page)}`} catalog={data} membership={context.membership_id} />}
        <nav className="pagination" aria-label="Páginas do catálogo">
          {q.page > 0 && <a href={href(q.page - 1)}>Anterior</a>}
          <span>{data.total} produto(s) · Página {q.page + 1}</span>
          {(q.page + 1) * q.pageSize < data.total && <a href={href(q.page + 1)}>Próxima</a>}
        </nav>
      </section>
    </AccessShell>;
  } catch (e) {
    return <AccessShell context={context}><h1>Catálogo indisponível</h1><p role="alert">{message(problemCode(e))}</p><a href={path}>Consultar novamente</a></AccessShell>;
  }
}
