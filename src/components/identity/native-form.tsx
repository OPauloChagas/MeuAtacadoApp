"use client";

import { useState } from "react";

/** Native POST deliberately performs a full navigation, discarding Router Cache. */
export function NativeForm({ action, children }: { action: string; children: React.ReactNode }) {
  const [pending, setPending] = useState(false);
  return <form action={action} method="post" onSubmit={() => setPending(true)} aria-busy={pending}>
    {children}
    {pending && <p role="status">Aguarde…</p>}
  </form>;
}
