"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { brl } from "@/modules/commercial/contracts";
import { CatalogProblem, message, parseQuoteResponse, type Catalog, type Quote } from "@/modules/catalog/contracts";

function Photo({ product, customer }: { product: Catalog["items"][number]; customer: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="hint">Foto indisponível.</p> : <Image unoptimized
    src={`/api/catalog/${product.id}/photo?customerId=${customer}`} alt={`Foto de ${product.name}`}
    width={240} height={180} className="product-photo" onError={() => setFailed(true)} />;
}

export function CatalogSelection({ catalog, membership }: { catalog: Catalog; membership: string }) {
  const [ready, setReady] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ signature: string; quote: Quote } | null>(null);
  const signature = JSON.stringify(quantities);
  const current = result?.signature === signature ? result.quote : null;

  useEffect(() => {
    setReady(true);
    // A restored document must revalidate its session and selected context.
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  async function simulate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = catalog.items.filter(p => quantities[p.id]).map(p => ({ product_id: p.id, quantity: Number(quantities[p.id]) }));
    if (!items.length) { setError("Informe a quantidade de pelo menos um produto."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/catalog", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Atacado-Context": membership },
        body: JSON.stringify({ customerId: catalog.customer.id, items, expectedToken: current?.token ?? null }),
      });
      const body = await response.json();
      if (!response.ok && !(response.status === 409 && body.error?.code === "PRICE_CHANGED")) {
        throw new CatalogProblem(typeof body.error?.code === "string" ? body.error.code : "UNAVAILABLE");
      }
      setResult({ signature, quote: parseQuoteResponse(body.data) });
    } catch (e) {
      setResult(null);
      setError(message(e instanceof CatalogProblem ? e.code : "UNAVAILABLE"));
    } finally { setPending(false); }
  }

  return <form onSubmit={event => void simulate(event)} aria-label="Simular seleção" aria-busy={pending}>
    <fieldset className="product-editor-fields" disabled={!ready || pending}>
      <legend className="sr-only">Produtos e quantidades</legend>
      <ul className="catalog-grid">{catalog.items.map(p => <li className="catalog-card" key={p.id}>
        {p.hasPhoto && <Photo product={p} customer={catalog.customer.id} />}
        <h3>{p.name}</h3><p className="hint">{p.sku}{p.category ? ` · ${p.category}` : ""}</p>
        {p.description && <p>{p.description}</p>}
        <p>{p.salesUnit}{p.packageContent ? ` · ${p.packageContent}` : ""}</p>
        <p className="catalog-price">{brl(p.unitPrice)}</p>
        <div className="field"><label htmlFor={`quantity-${p.id}`}>Quantidade de {p.name}</label>
          <input id={`quantity-${p.id}`} type="number" inputMode="numeric" min={1} max={1000000} step={1}
            value={quantities[p.id] ?? ""} aria-describedby={`rules-${p.id}`}
            onChange={event => { setQuantities(previous => ({ ...previous, [p.id]: event.target.value })); setError(""); }} />
          <p id={`rules-${p.id}`} className="hint">Mínimo {p.minimum}; múltiplos de {p.multiple}. Deixe vazio para não selecionar.</p>
        </div>
      </li>)}</ul>
      <button type="submit" className="button">{pending ? "Calculando…" : current?.status === "price_changed" ? "Revisar simulação" : "Calcular simulação"}</button>
    </fieldset>
    {pending && <p role="status">Consultando preços e disponibilidade…</p>}
    {error && <p role="alert" className="notice notice-error">{error}</p>}
    {current && <section aria-label="Resultado da simulação" aria-live="polite">
      <h2>Simulação de valores</h2>
      {current.status === "price_changed" ? <p role="alert" className="notice notice-error">{message("PRICE_CHANGED")}</p>
        : <p role="status">Valores calculados com os preços disponíveis agora.</p>}
      <ul className="admin-list">{current.items.map(line => <li key={line.productId}>
        <strong>{line.name}</strong><p>{line.quantity} × {brl(line.unitPrice)} = {brl(line.lineTotal)}</p>
      </li>)}</ul>
      <p className="catalog-price">Total: {brl(current.total)}</p>
      <p className="hint">Esta simulação não reserva preços. Nenhum pedido foi enviado.</p>
    </section>}
  </form>;
}
