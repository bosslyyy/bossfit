"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingScreen } from "@/components/ui/loading-screen";

const PUBLIC_ROUTES = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);
const REDIRECT_IF_AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password"]);

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.has(pathname);
}

export function AuthGuard({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, isConfigured } = useSupabaseAuth();
  const publicRoute = isPublicRoute(pathname);
  const redirectIfAuth = REDIRECT_IF_AUTH_ROUTES.has(pathname);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    if (status === "authenticated" && publicRoute && redirectIfAuth) {
      router.replace("/");
      return;
    }

    if (status === "unauthenticated" && !publicRoute) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [isConfigured, pathname, publicRoute, redirectIfAuth, router, status]);

  if (!isConfigured && !publicRoute) {
    return (
      <div className="flex min-h-[70vh] items-center">
        <Card className="w-full space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">BossFit Access</p>
            <CardTitle>Falta terminar la configuración de acceso</CardTitle>
            <CardDescription>
              Esta versión todavía no puede abrir cuentas. Revisa la configuración del proyecto y vuelve a intentar.
            </CardDescription>
          </div>
          <Link href="/login" className={buttonVariants({ variant: "secondary" })}>
            Abrir login
          </Link>
        </Card>
      </div>
    );
  }

  if (status === "loading") {
    return <LoadingScreen title="Verificando tu sesión..." />;
  }

  if (status === "unauthenticated" && !publicRoute) {
    return <LoadingScreen title="Abriendo acceso..." />;
  }

  if (status === "authenticated" && publicRoute && redirectIfAuth) {
    return <LoadingScreen title="Entrando a BossFit..." />;
  }

  return <>{children}</>;
}
