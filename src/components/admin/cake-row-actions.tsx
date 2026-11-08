"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loading01 } from "@animateicons/react/huge";
import { Delete02 } from "@animateicons/react/huge";
import { Power } from "lucide-react";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import { deleteCakeAction, toggleCakeActiveAction } from "@/lib/actions/admin";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

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
  const [pending, startTransition] = useTransition();
  // AnimateIcons refs for cake row actions
  const toggleIcon = useAnimIcon();
  const trashIcon = useAnimIcon();

  function toggle() {
    if (pending) return;
    const next = !isActive;
    startTransition(async () => {
      const toastId = toast.loading(next ? "চালু করা হচ্ছে..." : "বন্ধ করা হচ্ছে...");
      const res = await toggleCakeActiveAction(cakeId, next);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
        return;
      }
      toast.update(toastId, {
        render: res.success ?? (next ? "চালু হয়েছে" : "বন্ধ হয়েছে"),
        type: "success",
        isLoading: false,
        autoClose: 3500,
      });
      router.refresh();
    });
  }

  async function remove() {
    if (pending) return;
    const ok = await confirmDialog({
      title: `"${cakeName}" মুছে ফেলবেন?`,
      text: "মুছে ফেলার পর এটি আর ফিরে আসবে না।",
      confirmText: "মুছে ফেলুন",
    });
    if (!ok) return;
    startTransition(async () => {
      const toastId = toast.loading("মুছে ফেলা হচ্ছে...");
      const res = await deleteCakeAction(cakeId);
      if (res.error) {
        toast.update(toastId, {
          render: res.error,
          type: "error",
          isLoading: false,
          autoClose: 3500,
        });
        return;
      }
      toast.update(toastId, {
        render: res.success ?? `"${cakeName}" মুছে ফেলা হয়েছে`,
        type: "success",
        isLoading: false,
        autoClose: 3500,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`btn btn-ghost btn-sm ${isActive ? "text-success" : "text-danger"}`}
        aria-label={isActive ? "বন্ধ করুন" : "চালু করুন"}
        title={isActive ? "বন্ধ করুন" : "চালু করুন"}
      >
        {pending ? (
          <Loading01 ref={toggleIcon} className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Power className="h-4 w-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="btn btn-ghost btn-sm text-danger"
        aria-label="মুছুন"
        title="মুছুন"
        onMouseEnter={() => trashIcon.current?.startAnimation()}
        onMouseLeave={() => trashIcon.current?.stopAnimation()}
      >
        <Delete02 ref={trashIcon} className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
