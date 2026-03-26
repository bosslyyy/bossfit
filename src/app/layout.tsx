import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BossFit",
    template: "%s | BossFit"
  },
  description:
    "BossFit es una PWA fitness para crear ejercicios, completar series por día y seguir tu progreso con una experiencia premium móvil.",
  applicationName: "BossFit",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-512.png", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-512sinfondo.png", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-512.png", type: "image/png" }
    ],
    apple: "/icon-512.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BossFit"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}



