"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

import { BrandLogo } from "@/components/ui/brand-logo";
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
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [isAwaitingCode, setIsAwaitingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
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
          ? "Register with your email and verify it with an 8-digit code."
          : "Sign in with your email or username and keep training where you left off.",
        cardTitle: "Secure access and progress by user",
        cardDescription: "Sign in to your account and continue with your plan, progress, and personal settings.",
        identifierLabel: isRegister ? "Email" : "Email or Username",
        identifierPlaceholder: isRegister ? "you@email.com" : "Username or you@email",
        passwordLabel: "Password",
        passwordPlaceholder: "Minimum 6 characters",
        forgotPassword: "I forgot my password",
        confirmPasswordLabel: "Confirm password",
        confirmPasswordPlaceholder: "Repeat your password",
        verificationLabel: "Verification code",
        verificationPlaceholder: "12345678",
        verificationHint: "Enter the code sent to",
        sendCode: "Send code",
        verifyAndCreate: "Verify and create account",
        resendCode: "Resend code",
        changeEmail: "Change email",
        submitLogin: "Sign in",
        footerQuestion: isRegister ? "Already have an account?" : "Don’t have an account yet?",
        footerAction: isRegister ? "Sign in here" : "Sign up",
        configError: "This build cannot open accounts yet.",
        missingFields: isRegister ? "Enter your email and password." : "Enter your email or username and password.",
        shortPassword: "Password must be at least 6 characters.",
        invalidEmail: "Enter a valid email address to create your account.",
        passwordMismatch: "Passwords do not match.",
        accessPrepError: "Could not prepare your access.",
        codeRequired: "Enter the verification code from your email.",
        invalidCode: "The code must be exactly 8 digits.",
        codeSent: "Code sent. Check your email and enter it here.",
        codeResent: "New code sent.",
        verifyFailed: "Could not verify your account.",
        sessionPrepError: "Could not prepare your session."
      }
    : {
        access: "BossFit Access",
        title: isRegister ? "Crea tu cuenta" : "Vuelve a BossFit",
        subtitle: isRegister
          ? "Registrate con tu email y confirma con un codigo de 8 digitos."
          : "Entra con tu email o usuario para seguir entrenando y continuar donde la dejaste.",
        cardTitle: "Acceso seguro y progreso por usuario",
        cardDescription: "Entra a tu cuenta y sigue con tu plan, tu progreso y tus ajustes personales.",
        identifierLabel: isRegister ? "Email" : "Email o Usuario",
        identifierPlaceholder: isRegister ? "tu@email.com" : "Usuario o tu@email",
        passwordLabel: "Contrasena",
        passwordPlaceholder: "Minimo 6 caracteres",
        forgotPassword: "Se me olvido la contrasena",
        confirmPasswordLabel: "Confirmar contrasena",
        confirmPasswordPlaceholder: "Repite tu contrasena",
        verificationLabel: "Codigo de verificacion",
        verificationPlaceholder: "12345678",
        verificationHint: "Ingresa el codigo enviado a",
        sendCode: "Enviar codigo",
        verifyAndCreate: "Verificar y crear cuenta",
        resendCode: "Reenviar codigo",
        changeEmail: "Cambiar email",
        submitLogin: "Iniciar sesion",
        footerQuestion: isRegister ? "¿Ya tienes cuenta?" : "¿Todavia no tienes cuenta?",
        footerAction: isRegister ? "Entra aqui" : "Registrate",
        configError: "Esta version todavia no puede abrir cuentas.",
        missingFields: isRegister ? "Completa tu email y contrasena." : "Completa tu email o usuario y contrasena.",
        shortPassword: "La contrasena debe tener al menos 6 caracteres.",
        invalidEmail: "Escribe un email valido para crear tu cuenta.",
        passwordMismatch: "Las contrasenas no coinciden.",
        accessPrepError: "No se pudo preparar tu acceso.",
        codeRequired: "Escribe el codigo de verificacion que llego por correo.",
        invalidCode: "El codigo debe tener exactamente 8 digitos.",
        codeSent: "Codigo enviado. Revisa tu correo y escribelo aqui.",
        codeResent: "Se envio un nuevo codigo.",
        verifyFailed: "No se pudo verificar tu cuenta.",
        sessionPrepError: "No se pudo preparar tu sesion."
      };

  const resetRegisterVerification = () => {
    setIsAwaitingCode(false);
    setVerificationCode("");
    setPendingEmail("");
    setPendingPassword("");
  };

  const handleResendCode = async () => {
    setError(null);
    setMessage(null);

    if (!pendingEmail) {
      setError(copy.invalidEmail);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(copy.accessPrepError);
      return;
    }

    setResendingCode(true);

    try {
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          shouldCreateUser: true
        }
      });

      if (resendError) {
        setError(resendError.message);
        return;
      }

      setMessage(copy.codeResent);
    } finally {
      setResendingCode(false);
    }
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
        const normalizedEmail = (isAwaitingCode ? pendingEmail : identifier).trim().toLowerCase();

        if (!isAwaitingCode) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
              shouldCreateUser: true
            }
          });

          if (otpError) {
            setError(otpError.message);
            return;
          }

          setPendingEmail(normalizedEmail);
          setPendingPassword(password);
          setIsAwaitingCode(true);
          setMessage(copy.codeSent);
          return;
        }

        if (!verificationCode.trim()) {
          setError(copy.codeRequired);
          return;
        }

        const normalizedCode = verificationCode.replace(/\D/g, "");
        if (normalizedCode.length !== 8) {
          setError(copy.invalidCode);
          return;
        }

        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: normalizedCode,
          type: "email"
        });

        if (verifyError) {
          setError(verifyError.message);
          return;
        }

        const passwordToSet = pendingPassword || password;
        const { error: passwordError } = await supabase.auth.updateUser({
          password: passwordToSet
        });

        if (passwordError) {
          setError(passwordError.message);
          return;
        }

        if (!verifyData.user?.id) {
          setError(copy.verifyFailed);
          return;
        }

        await hydrateStoreForUser(verifyData.user.id);
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
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface/70">
            <BrandLogo size={22} priority />
          </div>
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
            {!isRegister || !isAwaitingCode ? (
              <>
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
              </>
            ) : null}

            {isRegister && isAwaitingCode ? (
              <>
                <div className="rounded-[20px] border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  {copy.verificationHint} <span className="font-semibold text-card-foreground">{pendingEmail}</span>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-card-foreground">{copy.verificationLabel}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={copy.verificationPlaceholder}
                    value={verificationCode}
                    maxLength={8}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={handleResendCode} disabled={resendingCode || submitting}>
                    {resendingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {copy.resendCode}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      resetRegisterVerification();
                      setMessage(null);
                      setError(null);
                    }}
                  >
                    {copy.changeEmail}
                  </Button>
                </div>
              </>
            ) : null}

            {!isRegister ? (
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm font-semibold text-accent">
                  {copy.forgotPassword}
                </Link>
              </div>
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

            <Button type="submit" className="w-full" disabled={submitting || !isConfigured || (isRegister && isAwaitingCode && !verificationCode.trim())}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isRegister ? (isAwaitingCode ? copy.verifyAndCreate : copy.sendCode) : copy.submitLogin}
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


