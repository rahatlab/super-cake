"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import { deletePostAction } from "@/lib/actions/admin";

/** Delete a blog post (with confirm) from the admin list. */
export function PostRowActions({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function remove() {
    if (pending) return;
    const ok = await confirmDialog({
      title: `"${title}" ব্লগটি মুছে ফেলবেন?`,
      text: "মুছে ফেলার পর এটি আর ফিরে আসবে না।",
      confirmText: "মুছে ফেলুন",
    });
    if (!ok) return;
    startTransition(async () => {
      const toastId = toast.loading("ব্লগ মুছে ফেলা হচ্ছে...");
      const res = await deletePostAction(postId);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
      } else {
        toast.update(toastId, {
          render: res.success ?? `"${title}" মুছে ফেলা হয়েছে`,
          type: "success",
          isLoading: false,
          autoClose: 3500,
        });
      }
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
    </div>
  );
}
