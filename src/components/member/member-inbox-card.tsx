"use client";

import { useEffect, useState } from "react";

import { BellRing, MessageSquareText, Send } from "lucide-react";

import { useSupabaseAuth } from "@/components/auth/supabase-auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/use-app-locale";
import { getIntlLocale } from "@/lib/i18n";
import {
  dismissMemberAlert,
  fetchMemberInbox,
  markMemberInboxRead,
  sendMemberMessage
} from "@/lib/supabase/member-inbox";
import type { MemberInboxResponse } from "@/types/coach";

const refreshIntervalMs = 12000;

function formatDateTime(value: string | undefined, locale: "es" | "en") {
  if (!value) {
    return locale === "en" ? "No date" : "Sin fecha";
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function MemberInboxCard() {
  const { session, status } = useSupabaseAuth();
  const locale = useAppLocale();
  const [inbox, setInbox] = useState<MemberInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = locale === "en"
    ? {
        title: "Coach inbox",
        newItems: "new",
        inboxError: "Could not load the coach inbox.",
        hide: "Hide",
        noAlerts: "You do not have active coach alerts right now.",
        chatTitle: "Chat with your coach",
        you: "You",
        coach: "Coach",
        noMessages: "There are no messages in this chat yet.",
        replyPlaceholder: "Reply to your coach...",
        send: "Send message"
      }
    : {
        title: "Coach inbox",
        newItems: "nuevos",
        inboxError: "No se pudo cargar el inbox del coach.",
        hide: "Ocultar",
        noAlerts: "No tienes alertas activas del coach ahora mismo.",
        chatTitle: "Chat con tu coach",
        you: "Tú",
        coach: "Coach",
        noMessages: "Todavía no hay mensajes en este chat.",
        replyPlaceholder: "Responde a tu coach...",
        send: "Enviar mensaje"
      };

  useEffect(() => {
    if (status !== "authenticated" || !session?.access_token) {
      setInbox(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async (markAsRead = false) => {
      try {
        if (!cancelled) {
          setError(null);
        }
        const nextInbox = await fetchMemberInbox(session.access_token);
        if (cancelled) {
          return;
        }
        setInbox(nextInbox);

        if (markAsRead && (nextInbox.unreadAlerts > 0 || nextInbox.unreadMessages > 0)) {
          const refreshed = await markMemberInboxRead(session.access_token);
          if (!cancelled) {
            setInbox(refreshed);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : copy.inboxError);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load(true);
    const intervalId = window.setInterval(() => {
      void load(false);
    }, refreshIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [copy.inboxError, session?.access_token, status]);

  if (loading || !inbox?.coach) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>
              {inbox.coach.name} · {inbox.coach.gymName} · {inbox.coach.groupName}
            </CardDescription>
          </div>
          <div className="rounded-[18px] border border-border bg-surface px-3 py-2 text-right text-sm">
            <p className="font-semibold text-card-foreground">{inbox.unreadAlerts + inbox.unreadMessages}</p>
            <p className="text-muted-foreground">{copy.newItems}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {inbox.alerts.length ? inbox.alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="rounded-[22px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(alert.createdAt, locale)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="h-10 px-3 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    if (!session?.access_token) return;
                    setBusy(true);
                    try {
                      const nextInbox = await dismissMemberAlert(session.access_token, alert.id);
                      setInbox(nextInbox);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {copy.hide}
                </Button>
              </div>
            </div>
          )) : (
            <div className="rounded-[22px] border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
              {copy.noAlerts}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-[24px] border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-accent" />
            <p className="font-semibold text-card-foreground">{copy.chatTitle}</p>
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {inbox.messages.length ? inbox.messages.map((message) => (
              <div key={message.id} className={`flex ${message.senderRole === "member" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-[18px] px-4 py-3 text-sm ${message.senderRole === "member" ? "bg-accent text-accent-foreground" : "bg-background text-card-foreground ring-1 ring-border"}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
                    {message.senderRole === "member" ? copy.you : copy.coach}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                  <p className="mt-2 text-[11px] opacity-70">{formatDateTime(message.createdAt, locale)}</p>
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground">{copy.noMessages}</div>
            )}
          </div>
          <div className="grid gap-3">
            <textarea className="min-h-[5.5rem] rounded-[20px] border border-border bg-background px-4 py-3 text-sm text-card-foreground outline-none" placeholder={copy.replyPlaceholder} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
            <Button
              disabled={busy || messageBody.trim().length < 1 || !session?.access_token}
              onClick={async () => {
                if (!session?.access_token || !messageBody.trim()) return;
                setBusy(true);
                try {
                  const nextInbox = await sendMemberMessage(session.access_token, messageBody.trim());
                  setInbox(nextInbox);
                  setMessageBody("");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              {copy.send}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
