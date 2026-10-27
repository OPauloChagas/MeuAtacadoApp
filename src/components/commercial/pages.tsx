import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AccessShell } from "@/components/identity/access-shell";
import { pageContext } from "@/modules/identity/session";
import { tables,versions,versionDetail,paymentTerms,assignments,customerCommercial } from "@/modules/commercial/service";
import { query,params,tablePath,versionPath,brl,rateLabel,CommercialProblem,type Kind } from "@/modules/commercial/contracts";
import { saveTable,saveVersion,setItem,publishVersion,saveTerm,setCustomerCommercial,assignCommission,endAssignment } from "@/modules/commercial/actions";
import { CommercialForm,type Field } from "./form";
import { ResourcePicker } from "./picker";
import { Search,Pagination,CalendarHint,instant,activeOptions } from "./shared";

export type RawQuery = Promise<Record<string,string | string[] | undefined>>;
const dates: Field[] = [{ name: "start_on",label: "Início agendado (opcional)",type: "date" },{ name: "end_on",label: "Fim exclusivo (opcional)",type: "date" }];
const tableFields: Field[] = [{ name: "name",label: "Nome da tabela",required: true },{ name: "active",label: "Situação da tabela",type: "select",options: activeOptions }];
const key = () => ({ key: randomUUID() });
const label = (k: Kind) => k==="price" ? "preço" : "comissão";
function Notice({ saved,published }: { saved?: string | undefined; published?: string | undefined }) { return <>{saved==="1" && <p role="status" className="notice">Cadastro salvo com sucesso.</p>}{published==="1" && <p role="status" className="notice">Versão publicada com sucesso. Seu conteúdo e período foram preservados.</p>}</>; }
function unavailable(error: unknown) { return error instanceof CommercialProblem && ["ACCESS_DENIED","VALIDATION_ERROR"].includes(error.code); }

export async function TablesPage({ kind: k,searchParams }: { kind: Kind; searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams,path = tablePath(k);
 try { const q = query(params(raw)), result = await tables(k,q);
 return <AccessShell context={context}><p className="eyebrow">Condições comerciais</p><h1>Tabelas de {label(k)}</h1><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} />
  {k==="commission" && <Link prefetch={false} href="/empresa/comissoes/atribuicoes">Atribuições aos vendedores</Link>}
  <section><h2>Nova tabela de {label(k)}</h2><CommercialForm action={saveTable} label="Nova tabela" button="Criar tabela" fields={[tableFields[0]!]} values={{ name: "" }} hidden={{ ...key(),kind: k,id: "",active: "true" }} /></section>
  <section><h2>Consultar tabelas</h2><Search path={path} q={q} />
   {!result.data.items.length ? <p>Nenhuma tabela encontrada neste acesso com os filtros atuais.</p> : <ul className="admin-list">{result.data.items.map(table => <li className="admin-item" key={table.id}><div><strong><Link prefetch={false} href={`${path}/${table.id}`}>{table.name}</Link></strong><p>{table.active ? "Ativa" : "Inativa"}</p></div></li>)}</ul>}
   <Pagination path={path} q={q} data={result.data} /></section>
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Consulta indisponível</h1><p role="alert">Confira os filtros informados e seu acesso.</p><Link prefetch={false} href={path}>Limpar filtros</Link></AccessShell>; }
}
export async function TablePage({ kind: k,tableId,searchParams }: { kind: Kind; tableId: string; searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams,path = tablePath(k);
 try { const q = query(params(raw)), result = await versions(k,tableId,q), t = result.table;
 return <AccessShell context={context}><p className="eyebrow">Tabela de {label(k)}</p><h1>{t.name}</h1><Link prefetch={false} href={path}>Voltar para tabelas</Link><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} />
  <section><h2>Dados da tabela</h2><CommercialForm action={saveTable} label="Editar tabela" button="Salvar tabela" fields={tableFields} values={{ name: t.name,active: String(t.active) }} hidden={{ ...key(),kind: k,id: t.id,revision: String(t.revision) }} /><p className="hint">Desativar impede novos usos, preservando versões e atribuições históricas.</p></section>
  <section><h2>Nova versão</h2><CalendarHint timezone={result.timezone} /><CommercialForm action={saveVersion} label="Nova versão" button="Criar rascunho" fields={k==="commission" ? [...dates,{ name: "default_rate",label: "Percentual padrão",type: "decimal",required: true,max: 20 }] : dates} values={{ start_on: "",end_on: "",default_rate: "" }} hidden={{ ...key(),kind: k,table_id: t.id,id: "" }} />
   {k==="commission" && <p className="hint">Percentual de 0 a 100 com até quatro casas decimais. Zero é uma escolha explícita.</p>}</section>
  <section><h2>Versões</h2>{!result.data.items.length ? <p>Nenhuma versão cadastrada.</p> : <ul className="admin-list">{result.data.items.map(v => <li className="admin-item" key={v.id}><div><strong><Link prefetch={false} href={versionPath(k,v.id)}>Versão {v.version}</Link></strong><p>{v.state==="draft" ? "Rascunho" : "Publicada"} · {v.validFrom ? instant(v.validFrom,result.timezone) : "Ao publicar"} → {instant(v.validUntil,result.timezone)}</p>{v.defaultRate!==null && <p>Padrão: {rateLabel(v.defaultRate)}</p>}</div></li>)}</ul>}<Pagination path={`${path}/${t.id}`} q={q} data={result.data} /></section>
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Tabela indisponível</h1><p role="alert">A tabela ou os filtros não estão disponíveis no acesso atual.</p><Link prefetch={false} href={path}>Voltar para tabelas</Link></AccessShell>; }
}
export async function VersionPage({ kind: k,versionId,searchParams }: { kind: Kind; versionId: string; searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams;
 try { const q = query(params(raw)), result = await versionDetail(k,versionId,q), v = result.version, path = versionPath(k,v.id), draft = v.state==="draft";
 return <AccessShell context={context}><p className="eyebrow">{v.tableName}</p><h1>Versão {v.version} · {label(k)}</h1><Link prefetch={false} href={`${tablePath(k)}/${v.tableId}`}>Voltar para a tabela</Link><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} published={typeof raw.publicado==="string" ? raw.publicado : undefined} />
  <section><h2>Vigência e estado</h2><p>{draft ? "Rascunho" : "Publicada"} · {v.validFrom ? instant(v.validFrom,result.timezone) : "Ao publicar"} → {instant(v.validUntil,result.timezone)}</p>
   <CalendarHint timezone={result.timezone} />{v.defaultRate!==null && <p>Percentual padrão: {rateLabel(v.defaultRate)}</p>}
   {draft && <CommercialForm action={saveVersion} label="Editar vigência" button="Salvar rascunho" fields={k==="commission" ? [...dates,{ name: "default_rate",label: "Percentual padrão",type: "decimal",required: true,max: 20 }] : dates} values={{ start_on: v.startOn ?? "",end_on: v.endOn ?? "",default_rate: v.defaultRate ?? "" }} hidden={{ ...key(),kind: k,table_id: v.tableId,id: v.id,revision: String(v.revision) }} />}
  </section>
  {draft && <section><h2>{k==="price" ? "Adicionar preço por produto" : "Adicionar exceção por produto"}</h2><CommercialForm action={setItem} label="Adicionar item" button={k==="price" ? "Salvar preço" : "Salvar exceção"} fields={[{ name: "value",label: k==="price" ? "Preço unitário (R$)" : "Percentual do produto",type: "decimal",required: true,max: 24 }]} values={{ value: "" }} hidden={{ ...key(),kind: k,version_id: v.id,revision: String(v.revision) }}>
   <ResourcePicker resource="product" name="product_id" label="Produto" required />
  </CommercialForm><p className="hint">Use vírgula ou ponto, sem separador de milhar. Preços com duas casas; percentuais com até quatro. Salvar produto já presente substitui o valor no rascunho.</p></section>}
  <section><h2>{k==="price" ? "Preços da versão" : "Exceções da versão"}</h2><Search path={path} q={q} status={false} label="Buscar produto por nome ou SKU" />
   {!result.data.items.length ? <p>{k==="price" ? "Nenhum preço encontrado nesta versão." : "Sem exceções nos filtros atuais; o padrão será aplicado aos demais produtos."}</p> : <ul className="admin-list">{result.data.items.map(item => <li className="admin-item" key={item.productId}><div className="stack"><strong>{item.sku} · {item.name}</strong><p>{k==="price" ? brl(item.value) : rateLabel(item.value)}{!item.active ? " · Produto inativo" : ""}</p>
    {draft && <><CommercialForm action={setItem} label={`Editar ${item.sku}`} button="Salvar valor" fields={[{ name: "value",label: k==="price" ? "Preço unitário (R$)" : "Percentual do produto",type: "decimal",required: true,max: 24 }]} values={{ value: item.value }} hidden={{ ...key(),kind: k,version_id: v.id,revision: String(v.revision),product_id: item.productId }} />
    <CommercialForm action={setItem} label={`Remover ${item.sku}`} button="Remover item do rascunho" hidden={{ ...key(),kind: k,version_id: v.id,revision: String(v.revision),product_id: item.productId,remove: "1" }} /></>}
   </div></li>)}</ul>}<Pagination path={path} q={q} data={result.data} /></section>
  {draft && <section><h2>Publicar versão</h2><p>Todos os itens cadastrados nesta versão serão publicados, inclusive fora do filtro. Conteúdo e vigência ficarão imutáveis. Não há substituição automática de períodos anteriores.</p>{!v.tableActive && <p role="status">Ative a tabela antes de publicar.</p>}<CommercialForm action={publishVersion} label="Publicar versão" button="Publicar versão" hidden={{ ...key(),kind: k,version_id: v.id,revision: String(v.revision) }} /></section>}
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Versão indisponível</h1><p role="alert">A versão ou os filtros não estão disponíveis no acesso atual.</p><Link prefetch={false} href={tablePath(k)}>Voltar para tabelas</Link></AccessShell>; }
}

const termFields: Field[] = [{ name: "name",label: "Nome da condição",required: true },{ name: "installments",label: "Número de parcelas",type: "number",min: 1,max: 12,required: true },{ name: "first_due_days",label: "Primeiro prazo (dias)",type: "number",min: 0,max: 365,required: true },{ name: "interval_days",label: "Intervalo entre parcelas (dias)",type: "number",min: 0,max: 365,required: true },{ name: "active",label: "Situação da condição",type: "select",options: activeOptions }];
export async function TermsPage({ searchParams }: { searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams,path = "/empresa/condicoes-pagamento";
 try { const q = query(params(raw)), result = await paymentTerms(q);
 return <AccessShell context={context}><p className="eyebrow">Condições comerciais</p><h1>Condições de pagamento</h1><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} />
  <p>Uma parcela usa intervalo zero; de duas a doze, intervalo de 1 a 365 dias. O primeiro prazo será uma sugestão na confirmação do pedido; esta tela não gera parcelas.</p>
  <section><h2>Nova condição</h2><CommercialForm action={saveTerm} label="Nova condição" button="Criar condição" fields={termFields} values={{ name: "",installments: "1",first_due_days: "0",interval_days: "0",active: "true" }} hidden={{ ...key(),id: "" }} /></section>
  <section><h2>Consultar condições</h2><Search path={path} q={q} />{!result.data.items.length ? <p>Nenhuma condição encontrada.</p> : <ul className="admin-list">{result.data.items.map(t => <li className="admin-item" key={t.id}><div><h3>{t.name}</h3><p>{t.installments} parcela(s) · {t.active ? "Ativa" : "Inativa"}</p><CommercialForm action={saveTerm} label={`Editar ${t.name}`} button="Salvar condição" fields={termFields} values={{ name: t.name,installments: String(t.installments),first_due_days: String(t.firstDueDays),interval_days: String(t.intervalDays),active: String(t.active) }} hidden={{ ...key(),id: t.id,revision: String(t.revision) }} /></div></li>)}</ul>}<Pagination path={path} q={q} data={result.data} /></section>
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Consulta indisponível</h1><Link prefetch={false} href={path}>Limpar filtros</Link></AccessShell>; }
}
export async function CustomerCommercialPage({ customerId,searchParams }: { customerId: string; searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams;
 try { const { data: c } = await customerCommercial(customerId);
 return <AccessShell context={context}><p className="eyebrow">Cliente · {c.name}</p><h1>Condições comerciais</h1><Link prefetch={false} href={`/empresa/clientes/${c.id}`}>Voltar para o cliente</Link><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} />
  <section><h2>Atribuições do cliente</h2><p>Tabela: {c.priceListName ?? "Sem atribuição"}{c.priceListActive===false ? " (inativa)" : ""} · Condição: {c.paymentTermName ?? "Sem atribuição"}{c.paymentTermActive===false ? " (inativa)" : ""}</p>
   <p>Sem tabela atribuída ou preço publicado vigente não há preço disponível. Nenhuma tabela genérica será usada automaticamente.</p>
   {c.status!=="active" ? <p role="status">Reative o cliente antes de alterar suas condições comerciais.</p> : <CommercialForm action={setCustomerCommercial} label="Atribuir condições" button="Salvar atribuições" hidden={{ ...key(),customer_id: c.id,revision: String(c.revision) }}>
    <ResourcePicker resource="price" name="price_list_id" label="Tabela de preço" {...(c.priceListId ? { selected: { id: c.priceListId,name: `${c.priceListName}${c.priceListActive===false ? " (inativa)" : ""}` } } : {})} />
    <ResourcePicker resource="payment" name="payment_term_id" label="Condição de pagamento" {...(c.paymentTermId ? { selected: { id: c.paymentTermId,name: `${c.paymentTermName}${c.paymentTermActive===false ? " (inativa)" : ""}` } } : {})} />
   </CommercialForm>}
  </section>
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Cliente indisponível</h1><Link prefetch={false} href="/empresa/clientes">Voltar para clientes</Link></AccessShell>; }
}
export async function AssignmentsPage({ searchParams }: { searchParams: RawQuery }) {
 const { context } = await pageContext("admin"), raw = await searchParams,path = "/empresa/comissoes/atribuicoes";
 try { const q = query(params(raw)), result = await assignments(q), states = { current: "Vigente",scheduled: "Agendada",ended: "Encerrada",cancelled: "Cancelada" };
 return <AccessShell context={context}><p className="eyebrow">Comissões</p><h1>Atribuições aos vendedores</h1><Link prefetch={false} href="/empresa/comissoes">Tabelas de comissão</Link><Notice saved={typeof raw.salvo==="string" ? raw.salvo : undefined} />{raw.encerrado==="1" && <p role="status" className="notice">Atribuição encerrada ou cancelada com sucesso. Histórico preservado.</p>}
  <section><h2>Nova atribuição</h2><CalendarHint timezone={result.timezone} starts="atribuir" /><CommercialForm action={assignCommission} label="Nova atribuição" button="Atribuir tabela" fields={dates} values={{ start_on: "",end_on: "" }} hidden={key()}>
   <ResourcePicker resource="seller" name="seller_id" label="Vendedor" required /><ResourcePicker resource="commission" name="table_id" label="Tabela de comissão" required />
  </CommercialForm><p className="hint">A confirmação futura de pedidos exigirá vendedor, tabela e versão vigente válidos. Atribuição não representa comissão ganha ou pagamento.</p></section>
  <section><h2>Consultar atribuições</h2><Search path={path} q={q} status={false} label="Buscar vendedor ou tabela" />{!result.data.items.length ? <p>Nenhuma atribuição encontrada.</p> : <ul className="admin-list">{result.data.items.map(a => <li className="admin-item" key={a.id}><div className="stack"><h3>{a.sellerName} · {a.tableName}</h3><p>{states[a.state]} · {instant(a.validFrom,result.timezone)} → {instant(a.validUntil,result.timezone)}</p>{(!a.sellerActive || !a.tableActive) && <p>Vendedor ou tabela inativos impedem novos usos.</p>}
   {["current","scheduled"].includes(a.state) && <><p className="hint">Fim vazio encerra agora ou cancela o agendamento ainda futuro. Não é permitido retroagir ou estender a atribuição.</p><CommercialForm action={endAssignment} label={`Encerrar ${a.id}`} button={a.state==="scheduled" ? "Encerrar ou cancelar agendamento" : "Encerrar atribuição"} fields={[{ name: "end_on",label: "Encerrar em (opcional)",type: "date" }]} values={{ end_on: "" }} hidden={{ ...key(),id: a.id,revision: String(a.revision) }} /></>}
  </div></li>)}</ul>}<Pagination path={path} q={q} data={result.data} /></section>
 </AccessShell>;
 } catch (e) { if (!unavailable(e)) throw e; return <AccessShell context={context}><h1>Consulta indisponível</h1><Link prefetch={false} href={path}>Limpar filtros</Link></AccessShell>; }
}
