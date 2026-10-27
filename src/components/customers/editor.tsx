"use client";
import { useActionState, useEffect, useState } from "react";
import { createCustomer, editCustomer, editCustomerContacts } from "@/modules/customers/actions";
import { addressKeys, contactKeys, fieldLabels, type CustomerDetail, type PageData, type SellerOption } from "@/modules/customers/contracts";

function SellerPicker({ value, onChange, currentLabel, initial }: {
  value: string; onChange: (id: string) => void; currentLabel: string;
  initial: PageData<SellerOption>;
}) {
  const [search, setSearch] = useState(""), [data, setData] = useState(initial);
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const [selectedName, setSelectedName] = useState(currentLabel);
  async function load(page: number) {
    setPending(true); setMessage("");
    try {
      const query = new URLSearchParams({ q: search, page: String(page) });
      const response = await fetch(`/api/customers/sellers?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("UNAVAILABLE");
      const body = await response.json();
      setData(body.data as PageData<SellerOption>);
    } catch { setMessage("Não foi possível consultar os vendedores. Tente novamente."); }
    finally { setPending(false); }
  }
  return <fieldset className="seller-picker">
    <legend>Carteira de vendedor</legend>
    <div className="field"><label htmlFor="seller-search">Buscar vendedor pelo nome</label><input id="seller-search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></div>
    <div className="inline-actions"><button type="button" className="text-button" disabled={pending} onClick={() => void load(0)}>Buscar vendedores</button>
      {data.page > 0 && <button type="button" className="text-button" disabled={pending} onClick={() => void load(data.page - 1)}>Vendedores anteriores</button>}
      {(data.page + 1) * data.pageSize < data.total && <button type="button" className="text-button" disabled={pending} onClick={() => void load(data.page + 1)}>Próximos vendedores</button>}
    </div>
    {pending && <p role="status">Consultando vendedores…</p>}
    {message && <p className="notice notice-error" role="alert">{message}</p>}
    <div className="field"><label htmlFor="seller_id">Vendedor responsável</label>
      <select id="seller_id" name="seller_id" value={value} onChange={event => {
        onChange(event.target.value);
        setSelectedName(data.items.find(item => item.id === event.target.value)?.name ?? currentLabel);
      }}>
        <option value="">Sem vendedor</option>
        {value && !data.items.some(item => item.id === value) && <option value={value}>{selectedName || "Vendedor atribuído"}</option>}
        {data.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
    <p className="hint">A consulta mostra até 20 vendedores por página. Somente vendedores ativos podem receber uma nova atribuição.</p>
  </fieldset>;
}

export function CustomerEditor({ customer, role, sellers, requestKey }: {
  customer?: CustomerDetail; role: "admin" | "seller"; sellers?: PageData<SellerOption>; requestKey: string;
}) {
  const isAdmin = role === "admin", editing = Boolean(customer);
  const action = isAdmin ? editing ? editCustomer : createCustomer : editCustomerContacts;
  const [state, submit, pending] = useActionState(action, { status: "idle", message: "" });
  const [values, setValues] = useState<Record<string, string>>({
    name: customer?.name ?? "", document: customer?.document ?? "", status: customer?.status ?? "active", seller_id: customer?.sellerId ?? "",
    ...Object.fromEntries(contactKeys.map(key => [key, customer?.contact[key] ?? ""])),
    ...Object.fromEntries(addressKeys.map(key => [key, customer?.address[key] ?? ""])),
  });
  useEffect(() => { if (state.destination) window.location.assign(state.destination); }, [state.destination]);
  const busy = pending || Boolean(state.destination);
  const change = (name: string, value: string) => setValues(previous => ({ ...previous, [name]: value }));
  return <form action={submit} className="stack" aria-busy={busy}>
    <input type="hidden" name="key" value={requestKey} />
    {customer && <><input type="hidden" name="customer_id" value={customer.id} /><input type="hidden" name="revision" value={customer.revision} /></>}
    {isAdmin && <>
      <div className="field"><label htmlFor="customer-name">Nome do cliente *</label><input id="customer-name" name="name" required maxLength={200} value={values.name ?? ""} onChange={event => change("name", event.target.value)} /></div>
      <div className="field"><label htmlFor="customer-document">Documento empresarial *</label><input id="customer-document" name="document" required maxLength={64} value={values.document ?? ""} onChange={event => change("document", event.target.value)} aria-describedby="document-help" /></div>
      <p id="document-help" className="hint">Letras e números são aceitos. Pontuação não diferencia o cadastro do mesmo documento.</p>
    </>}
    <fieldset className="customer-fields"><legend>Contato</legend><div className="form-grid">
      {contactKeys.map(key => <div className="field" key={key}><label htmlFor={`customer-${key}`}>{fieldLabels[key]}</label>
        <input id={`customer-${key}`} name={key} type={key === "email" ? "email" : "tel"} maxLength={key === "email" ? 254 : 30} value={values[key] ?? ""} onChange={event => change(key, event.target.value)} />
      </div>)}
    </div></fieldset>
    <fieldset className="customer-fields"><legend>Endereço</legend><div className="form-grid">
      {addressKeys.map(key => <div className="field" key={key}><label htmlFor={`customer-${key}`}>{fieldLabels[key]}</label>
        <input id={`customer-${key}`} name={key} maxLength={key === "state" ? 2 : 160} value={values[key] ?? ""} onChange={event => change(key, event.target.value)} />
      </div>)}
    </div></fieldset>
    {isAdmin && sellers && <SellerPicker value={values.seller_id ?? ""} onChange={value => change("seller_id", value)}
      currentLabel={`${customer?.sellerName ?? "Vendedor atribuído"}${customer?.sellerActive === false ? " (inativo)" : ""}`} initial={sellers} />}
    {isAdmin && editing && <div className="field"><label htmlFor="customer-status">Situação do cliente</label>
      <select id="customer-status" name="status" value={values.status ?? "active"} onChange={event => change("status", event.target.value)}><option value="active">Ativo</option><option value="inactive">Inativo</option></select>
      <p className="hint">Ao bloquear o cliente, seus compradores e vendedores perdem o acesso operacional. O histórico é preservado.</p>
    </div>}
    <p className="hint">{isAdmin ? "* Campos obrigatórios." : "Você pode editar somente o contato e o endereço da sua carteira."}</p>
    {state.message && <p className="notice notice-error" role="alert">{state.message}</p>}
    <button className="button" disabled={busy}>{busy ? "Aguarde…" : editing ? "Salvar alterações" : "Cadastrar cliente"}</button>
  </form>;
}
