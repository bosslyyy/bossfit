"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/hooks/use-app-locale";
import { APP_VERSION } from "@/lib/constants";
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
  const locale = useAppLocale();
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

  const copy = locale === "en"
    ? {
        access: "BossFit Access",
        title: isRegister ? "Create your account" : "Welcome back to BossFit",
        subtitle: isRegister
          ? "Create your account and start building your routine today."
          : "Sign in with your email or username and keep training where you left off.",
        cardTitle: "Secure access and progress by user",
        cardDescription: "Sign in to your account and continue with your plan, progress, and personal settings.",
        identifierLabel: isRegister ? "Email" : "Email or Username",
        identifierPlaceholder: isRegister ? "you@bossfit.app" : "Username or you@email",
        passwordLabel: "Password",
        passwordPlaceholder: "Minimum 6 characters",
        forgotPassword: "I forgot my password",
        confirmPasswordLabel: "Confirm password",
        confirmPasswordPlaceholder: "Repeat your password",
        submit: isRegister ? "Create account" : "Sign in",
        footerQuestion: isRegister ? "Already have an account?" : "Don’t have an account yet?",
        footerAction: isRegister ? "Sign in here" : "Sign up",
        configError: "This build cannot open accounts yet.",
        missingFields: isRegister ? "Enter your email and password." : "Enter your email or username and password.",
        shortPassword: "Password must be at least 6 characters.",
        invalidEmail: "Enter a valid email address to create your account.",
        passwordMismatch: "Passwords do not match.",
        accessPrepError: "Could not prepare your access.",
        signUpConfirmation:
          "Your account was created. If this project requires email confirmation, check your inbox and then sign in.",
        sessionPrepError: "Could not prepare your session."
      }
    : {
        access: "BossFit Access",
        title: isRegister ? "Crea tu cuenta" : "Vuelve a BossFit",
        subtitle: isRegister
          ? "Crea tu cuenta y empieza a construir tu rutina desde hoy."
          : "Entra con tu email o usuario para seguir entrenando y continuar donde la dejaste.",
        cardTitle: "Acceso seguro y progreso por usuario",
        cardDescription: "Entra a tu cuenta y sigue con tu plan, tu progreso y tus ajustes personales.",
        identifierLabel: isRegister ? "Email" : "Email o Usuario",
        identifierPlaceholder: isRegister ? "tu@bossfit.app" : "Usuario o tu@email",
        passwordLabel: "Contraseña",
        passwordPlaceholder: "Mínimo 6 caracteres",
        forgotPassword: "Se me olvidó la contraseña",
        confirmPasswordLabel: "Confirmar contraseña",
        confirmPasswordPlaceholder: "Repite tu contraseña",
        submit: isRegister ? "Crear cuenta" : "Iniciar sesión",
        footerQuestion: isRegister ? "¿Ya tienes cuenta?" : "¿Todavía no tienes cuenta?",
        footerAction: isRegister ? "Entra aquí" : "Regístrate",
        configError: "Esta versión todavía no puede abrir cuentas.",
        missingFields: isRegister ? "Completa tu email y contraseña." : "Completa tu email o usuario y contraseña.",
        shortPassword: "La contraseña debe tener al menos 6 caracteres.",
        invalidEmail: "Escribe un email válido para crear tu cuenta.",
        passwordMismatch: "Las contraseñas no coinciden.",
        accessPrepError: "No se pudo preparar tu acceso.",
        signUpConfirmation:
          "Tu cuenta fue creada. Si tu proyecto exige confirmación por email, revisa tu bandeja y luego inicia sesión.",
        sessionPrepError: "No se pudo preparar tu sesión."
      };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isConfigured) {
      setError(copy.configError);
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setError(copy.missingFields);
      return;
    }

    if (password.length < 6) {
      setError(copy.shortPassword);
      return;
    }

    if (isRegister && !identifier.includes("@")) {
      setError(copy.invalidEmail);
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(copy.accessPrepError);
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
          setMessage(copy.signUpConfirmation);
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
      const fallback = authError instanceof Error ? authError.message : copy.sessionPrepError;
      setError(fallback);
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
          <p className="max-w-[26rem] text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <Card className="space-y-5">
          <div className="flex items-start gap-3 rounded-[24px] border border-border bg-surface p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>{copy.cardTitle}</CardTitle>
              <CardDescription>{copy.cardDescription}</CardDescription>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{copy.identifierLabel}</span>
              <div className="relative">
                {isRegister ? (
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type={isRegister ? "email" : "text"}
                  autoComplete={isRegister ? "email" : "username"}
                  placeholder={copy.identifierPlaceholder}
                  className="pl-11"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-card-foreground">{copy.passwordLabel}</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={copy.passwordPlaceholder}
                  className="pl-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </label>

            {!isRegister ? (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm font-semibold text-accent">
                  {copy.forgotPassword}
                </Link>
              </div>
            ) : null}

            {isRegister ? (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-card-foreground">{copy.confirmPasswordLabel}</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={copy.confirmPasswordPlaceholder}
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
              {copy.submit}
            </Button>
          </form>

          <div className="rounded-[22px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {copy.footerQuestion}{" "}
            <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent">
              {copy.footerAction}
            </Link>
          </div>

          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{APP_VERSION}</p>
        </Card>
      </div>
    </div>
  );
}
