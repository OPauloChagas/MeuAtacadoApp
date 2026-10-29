"use client";

import { useState } from "react";

/** Native submission performs a full navigation, discarding Router Cache. */
export function NativeForm({ action, children, method = "post", className }: { action: string; children: React.ReactNode; method?: "get" | "post"; className?: string }) {
  const [pending, setPending] = useState(false);
  return <form action={action} method={method} className={className} onSubmit={() => setPending(true)} aria-busy={pending}>
    {children}
    {pending && <p role="status">Aguarde…</p>}
  </form>;
}
