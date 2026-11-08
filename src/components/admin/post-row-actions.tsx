"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loading01 } from "@animateicons/react/huge";
import { Delete02 } from "@animateicons/react/huge";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import { deletePostAction } from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

/** Delete a blog post (with confirm) from the admin list. */
export function PostRowActions({ postId, title }: { postId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const trashIcon = useAnimIcon();

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
          <Loading01 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Delete02 ref={trashIcon} className="h-3.5 w-3.5" aria-hidden />
        )}
        Delete
      </button>
    </div>
  );
}
