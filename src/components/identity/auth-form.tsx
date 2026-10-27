"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormAction } from "@/modules/identity/contracts";

type Kind = "login" | "recover" | "confirm" | "password";
export function AuthForm({ action, kind, tokenHash = "" }: { action: FormAction; kind: Kind; tokenHash?: string }) {
  const [state, submit, pending] = useActionState(action, { status: "idle", message: "" });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (state.destination) window.location.replace(state.destination);
  }, [state.destination]);
  const busy = pending || Boolean(state.destination);
  const labels = { login: "Entrar", recover: "Enviar instruções", confirm: "Confirmar recuperação", password: "Salvar nova senha" };
  const hasPassword = kind === "login" || kind === "password";
  return (
    <form action={submit} className="stack" aria-busy={busy}>
      {(kind === "login" || kind === "recover") && <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" inputMode="email" required maxLength={254} defaultValue={state.email ?? ""} />
      </div>}
      {hasPassword && <>
        <div className="field">
          <label htmlFor="password">{kind === "login" ? "Senha" : "Nova senha"}</label>
          <input id="password" name="password" type={visible ? "text" : "password"} autoComplete={kind === "login" ? "current-password" : "new-password"} required minLength={kind === "password" ? 12 : 1} maxLength={128} aria-describedby={kind === "password" ? "password-help" : undefined} />
        </div>
        <button type="button" className="text-button" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ocultar senha" : "Mostrar senha"}</button>
      </>}
      {kind === "password" && <>
        <p id="password-help" className="hint">Use de 12 a 128 caracteres. Escolha uma senha que você ainda não utilizou.</p>
        <div className="field"><label htmlFor="confirmation">Repita a nova senha</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></div>
      </>}
      {kind === "confirm" && <input name="token_hash" type="hidden" value={tokenHash} />}
      {state.message && <p className={`notice ${state.status === "error" ? "notice-error" : ""}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <button className="button" disabled={busy}>{busy ? "Aguarde…" : labels[kind]}</button>
    </form>
  );
}
