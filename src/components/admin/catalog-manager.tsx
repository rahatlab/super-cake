"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { confirmDialog } from "@/lib/confirm";
import type { CatalogListItem } from "@/lib/types";
import {
  deleteCategoryAction,
  deleteFlavourAction,
  saveCategoryAction,
  saveFlavourAction,
  type ActionState,
} from "@/lib/actions/admin";

const initial: ActionState = {};

function ListSection({
  title,
  bn,
  items,
  usage,
  saveAction,
  deleteAction,
}: {
  title: string;
  bn: string;
  items: CatalogListItem[];
  usage: Record<string, number>;
  saveAction: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  deleteAction: (id: string) => Promise<ActionState>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pendingDelete, startDelete] = useTransition();
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const result = await saveAction(prev, fd);
      if (result.success) {
        toast.success(result.success);
        setEditingId(null);
        setFormKey((k) => k + 1);
      } else if (result.error) {
        toast.error(result.error);
      }
      router.refresh();
      return result;
    },
    initial,
  );

  async function remove(item: CatalogListItem) {
    const ok = await confirmDialog({
      title: `"${item.name}" মুছে ফেলবেন?`,
      text: usage[item.name] ? `${usage[item.name]} টি কেক ব্যবহার করছে — মুছে ফেলা যাবে না।` : "এই তালিকা থেকে নামটি সরানো হবে।",
      confirmText: "মুছে ফেলুন",
    });
    if (!ok) return;
    startDelete(async () => {
      const res = await deleteAction(item.id);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "মুছে ফেলা হয়েছে");
      router.refresh();
    });
  }

  const editing = items.find((i) => i.id === editingId);
  void state;

  return (
    <section className="card p-5">
      <h2 className="text-base font-extrabold">{title} <span className="text-sm text-muted">· {bn}</span></h2>

      <form key={formKey} action={formAction} className="mt-4 flex flex-wrap gap-2">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input
          name="name"
          required
          maxLength={60}
          defaultValue={editing?.name ?? ""}
          placeholder={editing ? "নাম বদলান…" : `নতুন ${bn} যোগ করুন…`}
          className="field min-w-52 flex-1"
        />
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "সেভ হচ্ছে…" : editing ? "আপডেট" : "যোগ করুন"}
        </button>
        {editing && (
          <button type="button" onClick={() => { setEditingId(null); setFormKey((k) => k + 1); }} className="btn btn-ghost btn-sm">
            বাতিল
          </button>
        )}
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="px-2 py-2 font-bold">নাম</th>
              <th className="px-2 py-2 font-bold">কেক</th>
              <th className="px-2 py-2 text-right font-bold">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-2 py-2 font-semibold">{item.name}</td>
                <td className="px-2 py-2 text-muted">{usage[item.name] ?? 0} টি</td>
                <td className="px-2 py-2">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditingId(item.id); setFormKey((k) => k + 1); }} className="btn btn-ghost btn-sm">Edit</button>
                    <button type="button" disabled={pendingDelete} onClick={() => remove(item)} className="btn btn-ghost btn-sm">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-2 py-6 text-center text-muted">এখনো কিছু নেই</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CatalogManager({
  categories,
  flavours,
  categoryUsage,
  flavourUsage,
}: {
  categories: CatalogListItem[];
  flavours: CatalogListItem[];
  categoryUsage: Record<string, number>;
  flavourUsage: Record<string, number>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ListSection title="Category" bn="ক্যাটাগরি" items={categories} usage={categoryUsage} saveAction={saveCategoryAction} deleteAction={deleteCategoryAction} />
      <ListSection title="Flavour" bn="ফ্লেভার" items={flavours} usage={flavourUsage} saveAction={saveFlavourAction} deleteAction={deleteFlavourAction} />
    </div>
  );
}
