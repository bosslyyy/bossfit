"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";

export function ResetPasswordCard() {
  const { supabase, session, status, isConfigured } = useSupabaseAuth();
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

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (!supabase || !ready) {
      setError("Abre este formulario desde el enlace que llegó a tu correo.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Completa ambos campos.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
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
      setMessage("Tu contraseña fue restablecida. Ya puedes entrar a BossFit con tu nueva clave.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo restablecer la contraseña.");
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
            Crea tu nueva contraseña
          </h1>
          <p className="max-w-[28rem] text-sm text-muted-foreground">
            Si abriste el enlace del correo correctamente, aquí podrás definir una contraseña nueva para tu cuenta.
          </p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>Restablecimiento seguro</CardTitle>
              <CardDescription>
                El enlace del correo abre una sesión temporal para que puedas cambiar tu contraseña sin conocer la anterior.
              </CardDescription>
            </div>
          </div>

          {!ready && status !== "loading" ? (
            <div className="rounded-[20px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Este enlace no parece activo todavía. Abre de nuevo el correo de recuperación o solicita uno nuevo.
            </div>
          ) : null}

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Nueva contraseña</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="pl-11"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">Confirmar contraseña</span>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu nueva contraseña"
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
              Guardar nueva contraseña
            </Button>
          </div>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            ¿Quieres volver?{" "}
            <Link href="/login" className="font-semibold text-accent">
              Ir al login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
