"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/admin";

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markNotificationReadAction(id);
          router.refresh();
        })
      }
      className="btn btn-ghost btn-sm"
      aria-label="পড়া হিসেবে মার্ক করুন"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Check className="h-3.5 w-3.5" aria-hidden />
      )}
      পড়া হয়েছে
    </button>
  );
}

export function MarkAllReadButton({ unread }: { unread: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (unread === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await markAllNotificationsReadAction();
            setMsg(res.error ? `⚠️ ${res.error}` : (res.success ?? null));
            router.refresh();
          })
        }
        className="btn btn-soft btn-sm"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <CheckCheck className="h-3.5 w-3.5" aria-hidden />
        )}
        সব পড়া হয়েছে
      </button>
      {msg && <span className="text-[11px] text-muted">{msg}</span>}
    </div>
  );
}
