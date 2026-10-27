"use client";
import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import type { FormState } from "@/modules/commercial/contracts";
export type Field = { name: string; label: string; type?: "text" | "date" | "number" | "select" | "decimal"; required?: boolean; max?: number; min?: number; options?: { value: string; label: string }[] };
export function CommercialForm({ action,label,button,fields = [],values = {},hidden,children }: {
 action: (state: FormState,form: FormData)=>Promise<FormState>; label: string; button: string; fields?: Field[]; values?: Record<string,string>; hidden: Record<string,string>; children?: ReactNode;
}) {
 const prefix = useId(), [ready,setReady] = useState(false), [inputs,setInputs] = useState(values);
 const [state,submit,pending] = useActionState(action,{ status: "idle",message: "" });
 useEffect(() => setReady(true),[]); useEffect(() => { if (state.destination) window.location.assign(state.destination); },[state.destination]);
 const busy = pending || Boolean(state.destination);
 return <form action={submit} className="stack" aria-label={label} aria-busy={!ready || busy}>
  <fieldset disabled={!ready} className="product-editor-fields"><legend className="sr-only">{label}</legend>
   {Object.entries(hidden).map(([name,value]) => <input key={name} type="hidden" name={name} value={value} />)}
   {fields.map(field => { const controlId = `${prefix}-${field.name}`, value = inputs[field.name] ?? ""; return <div className="field" key={field.name}><label htmlFor={controlId}>{field.label}{field.required ? " *" : ""}</label>
    {field.type === "select" ? <select id={controlId} name={field.name} value={value} onChange={event => setInputs(previous => ({ ...previous,[field.name]: event.target.value }))}>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    : <input id={controlId} name={field.name} type={field.type === "decimal" ? "text" : field.type ?? "text"} {...(field.type === "decimal" ? { inputMode: "decimal" as const } : {})} required={field.required} {...(field.type === "number" ? { min: field.min ?? 0,max: field.max,step: 1 } : { maxLength: field.max ?? 100 })} value={value} onChange={event => setInputs(previous => ({ ...previous,[field.name]: event.target.value }))} />}
   </div>; })}
   {children}
   {state.message && <div role="alert" className="notice notice-error"><p>{state.message}</p><button type="button" className="text-button" onClick={() => window.location.reload()}>Recarregar</button></div>}
   <button className="button" disabled={!ready || busy}>{!ready || busy ? "Aguarde…" : button}</button>
  </fieldset>
 </form>;
}
