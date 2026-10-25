import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atacado | Ambiente de desenvolvimento",
  description: "Base de desenvolvimento do sistema Atacado.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}
