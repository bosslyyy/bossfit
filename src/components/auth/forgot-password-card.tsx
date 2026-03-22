"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Loader2, MailQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/hooks/use-app-locale";
import { APP_VERSION } from "@/lib/constants";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveLoginEmail } from "@/lib/supabase/resolve-login";

export function ForgotPasswordCard() {
  const locale = useAppLocale();
  const isConfigured = isSupabaseConfigured();
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const copy = locale === "en"
    ? {
        access: "BossFit Access",
        title: "Recover your access",
        subtitle: "Enter your email or username and we will send you a link to create a new password.",
        cardTitle: "I forgot my password",
        cardDescription: "If you do not remember your access, you can create a new password for your account from here.",
        identifierLabel: "Email or Username",
        identifierPlaceholder: "Username or you@email",
        configError: "This build cannot recover accounts yet.",
        missingIdentifier: "Enter your email or username.",
        recoveryPrepError: "Could not prepare password recovery.",
        recoverySent: "We sent you a link to reset your password. Check your email and open the link on this same device.",
        recoveryError: "Could not send the recovery email.",
        submit: "Send recovery link",
        footerQuestion: "Remembered your access?",
        footerAction: "Back to login"
      }
    : {
        access: "BossFit Access",
        title: "Recupera tu acceso",
        subtitle: "Escribe tu email o usuario y te mandaremos un enlace para crear una contraseña nueva.",
        cardTitle: "Se me olvidó la contraseña",
        cardDescription: "Si no recuerdas tu acceso, desde aquí puedes crear una contraseña nueva para tu cuenta.",
        identifierLabel: "Email o Usuario",
        identifierPlaceholder: "Usuario o tu@email",
        configError: "Esta versión todavía no puede recuperar cuentas.",
        missingIdentifier: "Escribe tu email o usuario.",
        recoveryPrepError: "No se pudo preparar la recuperación.",
        recoverySent: "Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo y abre el link en este mismo dispositivo.",
        recoveryError: "No se pudo enviar el correo de recuperación.",
        submit: "Enviar enlace de recuperación",
        footerQuestion: "¿Recordaste tu acceso?",
        footerAction: "Volver al login"
      };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isConfigured) {
      setError(copy.configError);
      return;
    }

    if (!identifier.trim()) {
      setError(copy.missingIdentifier);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase || typeof window === "undefined") {
      setError(copy.recoveryPrepError);
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

      setMessage(copy.recoverySent);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.recoveryError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <div className="w-full space-y-5">
        <div className="space-y-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">{copy.access}</p>
          <h1 className="font-display text-[clamp(2.2rem,10vw,3.6rem)] font-semibold leading-none text-foreground">
            {copy.title}
          </h1>
          <p className="max-w-[28rem] text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <MailQuestion className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>{copy.cardTitle}</CardTitle>
              <CardDescription>{copy.cardDescription}</CardDescription>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{copy.identifierLabel}</span>
              <Input
                type="text"
                autoComplete="username"
                placeholder={copy.identifierPlaceholder}
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
              {copy.submit}
            </Button>
          </form>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {copy.footerQuestion}{" "}
            <Link href="/login" className="font-semibold text-accent">
              {copy.footerAction}
            </Link>
          </div>

          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{APP_VERSION}</p>
        </Card>
      </div>
    </div>
  );
}
