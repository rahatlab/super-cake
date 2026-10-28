"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deletePostAction } from "@/lib/actions/admin";

/** Delete a blog post (with confirm) from the admin list. */
export function PostRowActions({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm(`"${title}" ব্লগটি মুছে ফেলতে চান?`)) return;
    startTransition(async () => {
      const res = await deletePostAction(postId);
      setMsg(res.error ? `⚠️ ${res.error}` : (res.success ?? null));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="btn btn-sm btn-ghost text-danger hover:bg-danger/10"
        aria-label={`${title} মুছে ফেলুন`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        )}
        Delete
      </button>
      {msg && <span className="text-[11px] font-semibold text-muted">{msg}</span>}
    </div>
  );
}
