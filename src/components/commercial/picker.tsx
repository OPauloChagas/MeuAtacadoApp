"use client";
import { useEffect, useId, useState } from "react";
import type { PageData } from "@/modules/commercial/contracts";
import type { Resource } from "@/modules/commercial/service";
type Option = { id: string; name: string };
export function ResourcePicker({ resource,name,label,selected,required = false }: { resource: Resource; name: string; label: string; selected?: Option; required?: boolean }) {
 const prefix = useId(), [search,setSearch] = useState(""), [value,setValue] = useState(selected?.id ?? ""), [selectedName,setSelectedName] = useState(selected?.name ?? "");
 const [data,setData] = useState<PageData<Option>>({ items: [],total: 0,page: 0,pageSize: 20 }), [pending,setPending] = useState(false), [error,setError] = useState("");
 async function load(page: number) { setPending(true); setError(""); try {
  const q = new URLSearchParams({ resource,q: search,page: String(page) }); const r = await fetch(`/api/commercial/options?${q}`,{ cache: "no-store" });
  if (!r.ok) throw new Error("UNAVAILABLE"); const body = await r.json(); if (!Array.isArray(body.data?.items)) throw new Error("UNAVAILABLE"); setData(body.data);
 } catch { setError("Não foi possível consultar as opções. Recarregue ou entre novamente."); } finally { setPending(false); } }
 useEffect(() => { void load(0); },[]);
 return <fieldset className="seller-picker"><legend>{label}</legend><input type="hidden" name={name} value={value} />
  <div className="field"><label htmlFor={`${prefix}-search`}>Buscar {label.toLowerCase()}</label><input id={`${prefix}-search`} maxLength={100} value={search} onChange={event => setSearch(event.target.value)} /></div>
  <div className="inline-actions"><button type="button" className="text-button" disabled={pending} onClick={() => void load(0)}>Buscar {label.toLowerCase()}</button>
   {data.page>0 && <button type="button" className="text-button" disabled={pending} onClick={() => void load(data.page-1)}>Opções anteriores</button>}
   {(data.page+1)*data.pageSize<data.total && <button type="button" className="text-button" disabled={pending} onClick={() => void load(data.page+1)}>Próximas opções</button>}</div>
  {pending && <p role="status">Consultando opções…</p>}{error && <p role="alert">{error}</p>}
  <div className="field"><label htmlFor={`${prefix}-select`}>{label}{required ? " *" : ""}</label><select id={`${prefix}-select`} value={value} required={required} onChange={event => { setValue(event.target.value); setSelectedName(data.items.find(item => item.id===event.target.value)?.name ?? selectedName); }}>
   <option value="">{required ? "Selecione" : "Sem atribuição"}</option>
   {value && !data.items.some(item => item.id===value) && <option value={value}>{selectedName || "Selecionado"}</option>}
   {data.items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </select></div><p className="hint">{data.total} opções ativas · página {data.page+1} · até 20 por página</p>
 </fieldset>;
}
