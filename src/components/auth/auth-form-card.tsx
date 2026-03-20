"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { hydrateStoreForUser } from "@/lib/supabase/hydrate-store";
import { resolveLoginEmail } from "@/lib/supabase/resolve-login";

function getSafeNextPath(candidate: string | null) {
  if (!candidate || !candidate.startsWith("/") || candidate === "/login" || candidate === "/register") {
    return "/";
  }

  return candidate;
}

export function AuthFormCard({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isConfigured = isSupabaseConfigured();
  const isRegister = mode === "register";

  const [nextPath, setNextPath] = useState("/");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isConfigured) {
      setError("Faltan variables de entorno de Supabase en .env.local.");
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setError(isRegister ? "Completa tu email y contraseña." : "Completa tu email o usuario y contraseña.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (isRegister && !identifier.includes("@")) {
      setError("Escribe un email válido para crear tu cuenta.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("No se pudo crear el cliente de Supabase.");
      return;
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: identifier.trim().toLowerCase(),
          password
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.session) {
          setMessage("Tu cuenta fue creada. Si tu proyecto exige confirmación por email, revisa tu bandeja y luego inicia sesión.");
          return;
        }

        if (data.user?.id) {
          await hydrateStoreForUser(data.user.id);
        }

        router.replace(nextPath);
        return;
      }

      const email = await resolveLoginEmail(identifier);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user?.id) {
        await hydrateStoreForUser(data.user.id);
      }

      router.replace(nextPath);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "No se pudo preparar tu sesión.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <div className="w-full space-y-5">
        <div className="space-y-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">BossFit Access</p>
          <h1 className="font-display text-[clamp(2.2rem,10vw,3.6rem)] font-semibold leading-none text-foreground">
            {isRegister ? "Crea tu cuenta" : "Vuelve a BossFit"}
          </h1>
          <p className="max-w-[26rem] text-sm text-muted-foreground">
            {isRegister
              ? "Activa tu progreso en la nube y sincroniza tus hábitos, series y ajustes por usuario."
              : "Entra con tu email o usuario para recuperar tu progreso y seguir entrenando sin perder continuidad."}
          </p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Acceso seguro y progreso por usuario</CardTitle>
              <CardDescription>
                BossFit seguirá funcionando con su store actual, pero ahora tus datos también podrán sincronizarse con Supabase en tu misma cuenta.
              </CardDescription>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{isRegister ? "Email" : "Email o Usuario"}</span>
              <div className="relative">
                {isRegister ? (
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type={isRegister ? "email" : "text"}
                  autoComplete={isRegister ? "email" : "username"}
                  placeholder={isRegister ? "tu@bossfit.app" : "Usuario o tu@email"}
                  className="pl-11"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Contraseña</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </label>

            {!isRegister ? (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm font-semibold text-accent">
                  Se me olvidó la contraseña
                </Link>
              </div>
            ) : null}

            {isRegister ? (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-card-foreground">Confirmar contraseña</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-[20px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-card-foreground">
                {message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting || !isConfigured}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </Button>
          </form>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {isRegister ? "¿Ya tienes cuenta?" : "¿Todavía no tienes cuenta?"}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent">
              {isRegister ? "Entra aquí" : "Regístrate"}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
