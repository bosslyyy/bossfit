"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/hooks/use-app-locale";

export function ResetPasswordCard() {
  const { supabase, session, status, isConfigured } = useSupabaseAuth();
  const locale = useAppLocale();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    if (status === "authenticated" && session?.user) {
      setReady(true);
    }
  }, [isConfigured, session?.user, status]);

  const copy = locale === "en"
    ? {
        access: "BossFit Access",
        title: "Create your new password",
        subtitle: "If you opened the email link correctly, you can define a new password for your account here.",
        cardTitle: "Secure reset",
        cardDescription:
          "The email link opens a temporary session so you can change your password without knowing the previous one.",
        inactiveLink: "This link does not seem active yet. Open the recovery email again or request a new one.",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        minimum: "Minimum 6 characters",
        repeat: "Repeat your new password",
        notReady: "Open this form from the link sent to your email.",
        fillFields: "Complete both fields.",
        shortPassword: "The new password must be at least 6 characters long.",
        mismatch: "Passwords do not match.",
        success: "Your password was reset. You can now sign in to BossFit with your new password.",
        fallbackError: "Could not reset the password.",
        submit: "Save new password",
        backQuestion: "Want to go back?",
        backAction: "Go to login"
      }
    : {
        access: "BossFit Access",
        title: "Crea tu nueva contrasena",
        subtitle: "Si abriste el enlace del correo correctamente, aqui podras definir una contrasena nueva para tu cuenta.",
        cardTitle: "Restablecimiento seguro",
        cardDescription:
          "El enlace del correo abre una sesion temporal para que puedas cambiar tu contrasena sin conocer la anterior.",
        inactiveLink: "Este enlace no parece activo todavia. Abre de nuevo el correo de recuperacion o solicita uno nuevo.",
        newPassword: "Nueva contrasena",
        confirmPassword: "Confirmar contrasena",
        minimum: "Minimo 6 caracteres",
        repeat: "Repite tu nueva contrasena",
        notReady: "Abre este formulario desde el enlace que llego a tu correo.",
        fillFields: "Completa ambos campos.",
        shortPassword: "La nueva contrasena debe tener al menos 6 caracteres.",
        mismatch: "Las contrasenas no coinciden.",
        success: "Tu contrasena fue restablecida. Ya puedes entrar a BossFit con tu nueva clave.",
        fallbackError: "No se pudo restablecer la contrasena.",
        submit: "Guardar nueva contrasena",
        backQuestion: "¿Quieres volver?",
        backAction: "Ir al login"
      };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!supabase || !ready) {
      setError(copy.notReady);
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError(copy.fillFields);
      return;
    }

    if (newPassword.length < 6) {
      setError(copy.shortPassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(copy.mismatch);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setError(error.message);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setMessage(copy.success);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.fallbackError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <div className="w-full space-y-5">
        <div className="space-y-3 px-1">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface/70">
            <BrandLogo size={22} priority />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-accent">{copy.access}</p>
          <h1 className="font-display text-[clamp(2.2rem,10vw,3.6rem)] font-semibold leading-none text-foreground">
            {copy.title}
          </h1>
          <p className="max-w-[28rem] text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>{copy.cardTitle}</CardTitle>
              <CardDescription>{copy.cardDescription}</CardDescription>
            </div>
          </div>

          {!ready && status !== "loading" ? (
            <div className="rounded-[20px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              {copy.inactiveLink}
            </div>
          ) : null}

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{copy.newPassword}</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="pl-11"
                  placeholder={copy.minimum}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{copy.confirmPassword}</span>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={copy.repeat}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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

            <Button type="button" className="w-full" disabled={submitting || !ready || !isConfigured} onClick={handleSubmit}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {copy.submit}
            </Button>
          </div>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {copy.backQuestion}{" "}
            <Link href="/login" className="font-semibold text-accent">
              {copy.backAction}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
