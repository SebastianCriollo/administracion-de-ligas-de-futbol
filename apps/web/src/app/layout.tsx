import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "Ligas — Gestión de torneos de fútbol",
    template: "%s · Ligas",
  },
  description:
    "Plataforma profesional para administrar ligas, torneos y campeonatos de fútbol en todas sus modalidades.",
};

/**
 * El tema se lee de la cookie en el servidor y se estampa como clase en
 * <html> — sin flash de tema incorrecto (FOUC) en SSR.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="es" className={`${theme} ${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
