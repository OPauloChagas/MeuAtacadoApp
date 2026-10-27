"use client";
import { useActionState, useEffect, useState } from "react";
import { createProduct, editProduct } from "@/modules/products/actions";
import type { Product } from "@/modules/products/contracts";

export function ProductEditor({ product, requestKey }: { product?: Product; requestKey: string }) {
  const [ready,setReady] = useState(false);
  useEffect(() => setReady(true),[]);
  const [state, submit, pending] = useActionState(product ? editProduct : createProduct,{ status: "idle", message: "" });
  const [values,setValues] = useState<Record<string,string>>({ sku: product?.sku ?? "", name: product?.name ?? "", description: product?.description ?? "", category: product?.category ?? "",
    sales_unit: product?.salesUnit ?? "unidade", package_content: product?.packageContent ?? "", min_quantity: String(product?.minQuantity ?? 1), quantity_multiple: String(product?.quantityMultiple ?? 1), active: String(product?.active ?? true) });
  useEffect(() => { if (state.destination) window.location.assign(state.destination); },[state.destination]);
  const busy = pending || Boolean(state.destination);
  const change = (key: string,value: string) => setValues(previous => ({ ...previous,[key]: value }));
  const fields = [ ["sku","SKU",64], ["name","Nome do produto",200], ["category","Categoria",100], ["sales_unit","Unidade de venda",32], ["package_content","Conteúdo da embalagem",160] ] as const;
  return <form action={submit} className="stack" aria-busy={busy || !ready}>
    <fieldset disabled={!ready} className="product-editor-fields">
    <input type="hidden" name="key" value={requestKey} />
    {product && <><input type="hidden" name="product_id" value={product.id} /><input type="hidden" name="revision" value={product.revision} /></>}
    {fields.map(([key,label,max]) => <div className="field" key={key}><label htmlFor={`product-${key}`}>{label}{["sku","name","sales_unit"].includes(key) ? " *" : ""}</label>
      <input id={`product-${key}`} name={key} required={["sku","name","sales_unit"].includes(key)} maxLength={max} value={values[key] ?? ""} onChange={event => change(key,event.target.value)} />
      {key === "sku" && <p className="hint">Letras e números, ponto, hífen, barra ou sublinhado. Maiúsculas e minúsculas representam o mesmo SKU.</p>}
      {key === "sales_unit" && <p className="hint">Exemplos: unidade, caixa, pacote. A venda usa quantidades inteiras dessa unidade.</p>}
    </div>)}
    <div className="field"><label htmlFor="product-description">Descrição</label><textarea id="product-description" name="description" maxLength={2000} rows={4} value={values.description ?? ""} onChange={event => change("description",event.target.value)} /></div>
    <div className="form-grid">{([["min_quantity","Quantidade mínima"],["quantity_multiple","Múltiplo de venda"]] as const).map(([key,label]) => <div className="field" key={key}><label htmlFor={`product-${key}`}>{label} *</label>
      <input id={`product-${key}`} name={key} type="number" inputMode="numeric" min={1} max={1000000} step={1} required value={values[key] ?? ""} onChange={event => change(key,event.target.value)} /></div>)}</div>
    <p className="hint">O pedido deverá alcançar o mínimo e usar quantidades divisíveis pelo múltiplo. Não há conversão automática de embalagem.</p>
    {product && <div className="field"><label htmlFor="product-active">Situação do produto</label><select id="product-active" name="active" value={values.active ?? "true"} onChange={event => change("active",event.target.value)}><option value="true">Ativo</option><option value="false">Inativo</option></select><p className="hint">Desativar preserva o cadastro e impede novas operações de venda.</p></div>}
    <p className="hint">* Campos obrigatórios. Você poderá adicionar uma foto depois de salvar o produto.</p>
    {state.message && <p role="alert" className="notice notice-error">{state.message}</p>}
    <button className="button" disabled={busy || !ready}>{busy || !ready ? "Aguarde…" : product ? "Salvar alterações" : "Cadastrar produto"}</button>
    </fieldset>
  </form>;
}
