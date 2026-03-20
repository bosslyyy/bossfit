"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Loader2, MailQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/supabase/resolve-login";

export function ForgotPasswordCard() {
  const isConfigured = isSupabaseConfigured();
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isConfigured) {
      setError("Faltan variables de entorno de Supabase en .env.local.");
      return;
    }

    if (!identifier.trim()) {
      setError("Escribe tu email o usuario.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase || typeof window === "undefined") {
      setError("No se pudo preparar la recuperación.");
      return;
    }

    setSubmitting(true);

    try {
      const email = await resolveLoginEmail(identifier);
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo y abre el link en este mismo dispositivo.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar el correo de recuperación.");
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
            Recupera tu acceso
          </h1>
          <p className="max-w-[28rem] text-sm text-muted-foreground">
            Escribe tu email o usuario y te mandaremos un enlace para crear una contraseña nueva.
          </p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <MailQuestion className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Se me olvidó la contraseña</CardTitle>
              <CardDescription>
                Si tu cuenta fue creada por un gym y no controlas el correo asignado, pide al owner o admin que te regenere el acceso desde el panel.
              </CardDescription>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Email o Usuario</span>
              <Input
                type="text"
                autoComplete="username"
                placeholder="Usuario o tu@email"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </label>

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
              Enviar enlace de recuperación
            </Button>
          </form>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            ¿Recordaste tu acceso?{" "}
            <Link href="/login" className="font-semibold text-accent">
              Volver al login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
