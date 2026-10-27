"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export function ProductPhoto({ id,name,revision }: { id: string; name: string; revision: number }) {
  const [failed,setFailed] = useState(false);
  return failed ? <p role="status">A foto está indisponível neste momento.</p> : <Image unoptimized src={`/api/products/${id}/photo?revision=${revision}`} alt={`Foto de ${name}`} width={320} height={240} className="product-photo" onError={() => setFailed(true)} />;
}
export function PhotoEditor({ id,revision,hasPhoto,requestKey }: { id: string; revision: number; hasPhoto: boolean; requestKey: string }) {
  const [ready,setReady] = useState(false);
  useEffect(() => setReady(true),[]);
  const [pending,setPending] = useState(false), [message,setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const native = event.nativeEvent as SubmitEvent;
    const button = native.submitter as HTMLButtonElement | null;
    const operation = button?.value ?? "upload"; form.set("operation",operation);
    if (operation !== "upload") form.delete("photo");
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/products/${id}/photo`,{ method: "POST", body: form, cache: "no-store" });
      const body = await response.json();
      if (!response.ok || typeof body.data?.destination !== "string") throw new Error(body.error?.message ?? "Não foi possível concluir. Tente novamente mais tarde.");
      window.location.assign(body.data.destination);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir."); setPending(false); }
  }
  return <form className="stack" onSubmit={event => void submit(event)} aria-busy={pending}>
    <fieldset disabled={!ready} className="product-editor-fields">
    <input type="hidden" name="revision" value={revision} /><input type="hidden" name="key" value={requestKey} />
    <div className="field"><label htmlFor="product-photo">Foto do produto</label><input type="file" id="product-photo" name="photo" accept="image/jpeg,image/png,image/webp" disabled={pending} aria-describedby="photo-help" />
      <p id="photo-help" className="hint">JPEG, PNG ou WebP, até 3 MB. Fotos sem animação; a orientação é ajustada e os metadados são removidos.</p></div>
    <div className="inline-actions"><button className="button" type="submit" value="upload" disabled={pending}>{pending ? "Aguarde…" : hasPhoto ? "Substituir foto" : "Enviar foto"}</button>
      {hasPhoto && <button className="text-button" type="submit" value="remove" disabled={pending}>Remover foto</button>}
      <button className="text-button" type="submit" value="cleanup" disabled={pending}>Limpar fotos não utilizadas</button></div>
    {message && <div className="notice notice-error" role="alert"><p>{message}</p><a href={`/empresa/produtos/${id}`}>Recarregar o produto</a></div>}
    </fieldset>
  </form>;
}
