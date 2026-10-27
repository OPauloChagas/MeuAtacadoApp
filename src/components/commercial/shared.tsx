import Link from "next/link";
import type { PageData,Query } from "@/modules/commercial/contracts";
export const activeOptions = [{ value: "true",label: "Ativo" },{ value: "false",label: "Inativo" }];
export function Search({ path,q,status = true,label = "Buscar por nome" }: { path: string; q: Query; status?: boolean; label?: string }) {
 return <form method="get" action={path} className="stack"><div className="field"><label htmlFor="q">{label}</label><input id="q" name="q" maxLength={100} defaultValue={q.search} /></div>
 {status && <div className="field"><label htmlFor="status">Situação</label><select id="status" name="status" defaultValue={q.status}><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></div>}<button className="button">Pesquisar</button></form>;
}
export function Pagination({ path,q,data }: { path: string; q: Query; data: Omit<PageData<unknown>,"items"> }) {
 const url = (page: number) => `${path}?${new URLSearchParams({ q: q.search,status: q.status,page: String(page),pageSize: String(q.pageSize) })}`;
 return <nav className="pagination" aria-label="Paginação"><span>{data.total} registros · página {data.page+1}</span>{data.page>0 && <Link prefetch={false} href={url(data.page-1)}>Página anterior</Link>}{(data.page+1)*data.pageSize<data.total && <Link prefetch={false} href={url(data.page+1)}>Próxima página</Link>}</nav>;
}
export function instant(value: string | null,timezone: string): string { return value ? new Intl.DateTimeFormat("pt-BR",{ timeZone: timezone,dateStyle: "short",timeStyle: "short" }).format(new Date(value)) : "Sem fim definido"; }
export function CalendarHint({ timezone,starts = "publicar" }: { timezone: string; starts?: string }) { return <p className="hint">Datas no fuso {timezone}. Início vazio: ao {starts}. Fim vazio: sem fim definido; data final exclusiva. Versões publicadas e seus períodos não podem ser alterados.</p>; }
