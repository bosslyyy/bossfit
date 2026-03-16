import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const themeInitScript = `
  try {
    const raw = localStorage.getItem("bossfit-store");
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme = parsed?.state?.theme;
      if (theme) {
        document.documentElement.dataset.theme = theme;
      }
    }
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
`;

export const metadata: Metadata = {
  title: {
    default: "BossFit",
    template: "%s | BossFit"
  },
  description: "BossFit es una PWA fitness para crear hábitos, completar series por día y seguir tu progreso con una experiencia premium móvil.",
  applicationName: "BossFit",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon"
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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
