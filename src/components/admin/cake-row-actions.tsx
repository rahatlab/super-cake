"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, Trash2 } from "lucide-react";
import { deleteCakeAction, toggleCakeActiveAction } from "@/lib/actions/admin";

/** Inline availability toggle + delete (with confirm) for the cake list. */
export function CakeRowActions({
  cakeId,
  cakeName,
  isActive,
}: {
  cakeId: string;
  cakeName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(isActive);

  function toggle() {
    const next = !active;
    startTransition(async () => {
      const res = await toggleCakeActiveAction(cakeId, next);
      if (res.error) {
        setMsg(`⚠️ ${res.error}`);
        return;
      }
      setActive(next);
      setMsg(res.success ?? null);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`"${cakeName}" মুছে ফেলতে চান? এটা ফেরানো যাবে না।`)) return;
    startTransition(async () => {
      const res = await deleteCakeAction(cakeId);
      if (res.error) {
        setMsg(`⚠️ ${res.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`btn btn-sm ${
            active ? "btn-ghost text-muted" : "bg-success/15 text-success hover:bg-success/25"
          }`}
          aria-label={active ? `${cakeName} বন্ধ করুন` : `${cakeName} চালু করুন`}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Power className="h-3.5 w-3.5" aria-hidden />
          )}
          {active ? "চালু" : "বন্ধ"}
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn btn-sm btn-ghost text-danger hover:bg-danger/10"
          aria-label={`${cakeName} মুছে ফেলুন`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </button>
      </div>

      {msg && <span className="text-[11px] font-semibold text-muted">{msg}</span>}
    </div>
  );
}
