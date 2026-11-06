"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
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
          const toastId = toast.loading("পড়া হিসেবে মার্ক করা হচ্ছে...");
          await markNotificationReadAction(id);
          toast.update(toastId, {
            render: "পড়া হিসেবে মার্ক করা হয়েছে",
            type: "success",
            isLoading: false,
            autoClose: 2000,
          });
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
  const [pending, startTransition] = useTransition();

  if (unread === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const toastId = toast.loading("সব নোটিফিকেশন পড়া হিসেবে মার্ক করা হচ্ছে...");
            const res = await markAllNotificationsReadAction();
            if (res.error) {
              toast.update(toastId, {
                render: res.error,
                type: "error",
                isLoading: false,
                autoClose: 3500,
              });
            } else {
              toast.update(toastId, {
                render: res.success ?? "সব নোটিফিকেশন পড়া হয়েছে",
                type: "success",
                isLoading: false,
                autoClose: 3500,
              });
            }
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
    </div>
  );
}
