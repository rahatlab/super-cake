"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Ban, CheckCircle, Mail, Phone, UserCircle2 } from "lucide-react";
import { toggleUserBlockAction } from "@/lib/actions/admin";
import { Pagination } from "@/components/pagination";
import { formatBDT, formatDateTime } from "@/lib/utils";
import type { Profile, UserOrderStats } from "@/lib/types";

interface UsersListProps {
  users: Profile[];
  /** Per-user order counters keyed by profile id (computed server-side). */
  stats: Record<string, UserOrderStats>;
}

const EMPTY_STATS: UserOrderStats = { total: 0, cancelled: 0, delivered: 0, flagged: 0, spent: 0 };
const PAGE_SIZE = 10;

export function UsersList({ users, stats }: UsersListProps) {
  const [isPending, startTransition] = useTransition();
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const handleToggleBlock = (userId: string, currentlyBlocked: boolean) => {
    if (isPending) return;

    setBlockingUserId(userId);
    startTransition(async () => {
      try {
        const result = await toggleUserBlockAction(userId, !currentlyBlocked);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success || "ইউজার স্ট্যাটাস আপডেট হয়েছে");
        }
      } catch (error) {
        toast.error("কিছু ভুল হয়েছে");
      } finally {
        setBlockingUserId(null);
      }
    });
  };

  const customerUsers = users.filter((u) => u.role === "customer");
  const adminUsers = users.filter((u) => u.role === "admin");

  const customerPages = Math.max(1, Math.ceil(customerUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, customerPages);
  const visibleCustomers = customerUsers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  if (users.length === 0) {
    return (
      <div className="card grid place-items-center gap-2 py-16 text-center">
        <span className="text-4xl" aria-hidden>
          👤
        </span>
        <p className="font-bold">কোনো রেজিস্টার্ড ইউজার নেই</p>
        <p className="text-sm text-muted">প্রথম ইউজার registration এর জন্য অপেক্ষা করুন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customers */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">কাস্টমার ({customerUsers.length})</h2>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">
                  নাম
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  যোগাযোগ
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  রেজিস্ট্রেশন
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  অর্ডার
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  স্ট্যাটাস
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visibleCustomers.map((user) => {
                const isBlocked = user.is_blocked ?? false;
                const isProcessing = blockingUserId === user.id;
                const s = stats[user.id] ?? EMPTY_STATS;

                return (
                  <tr key={user.id} className={`transition-colors hover:bg-fg/[0.03] ${isBlocked ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand-strong">
                          <UserCircle2 className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          {user.birthdate && (
                            <p className="text-xs text-muted">🎂 {user.birthdate}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <a href={`tel:${user.phone}`} className="flex items-center gap-1.5 text-xs hover:text-brand-strong">
                          <Phone className="h-3 w-3" aria-hidden />
                          {user.phone}
                        </a>
                        {user.email && (
                          <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 text-xs text-muted hover:text-brand-strong">
                            <Mail className="h-3 w-3" aria-hidden />
                            {user.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDateTime(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">
                        {s.total} অর্ডার
                        {s.cancelled > 0 && (
                          <span className="ml-1.5 text-rose-600 dark:text-rose-400">
                            ({s.cancelled} বাতিল)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {s.delivered} ডেলিভার · {formatBDT(s.spent)}
                      </p>
                      {s.flagged > 0 && (
                        <span className="mt-1 inline-flex badge bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          🚩 {s.flagged} ফেক অর্ডার
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isBlocked ? (
                        <span className="badge bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <Ban className="mr-1 h-3 w-3" aria-hidden />
                          Blocked
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="mr-1 h-3 w-3" aria-hidden />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(user.id, isBlocked)}
                        disabled={isProcessing}
                        className={`btn btn-sm ${
                          isBlocked
                            ? "btn-soft"
                            : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                        }`}
                      >
                        {isProcessing ? (
                          "লোড হচ্ছে..."
                        ) : isBlocked ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden /> Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" aria-hidden /> Block
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {customerUsers.length > 0 && (
          <Pagination
            page={safePage}
            totalPages={customerPages}
            total={customerUsers.length}
            onPageChange={setPage}
            className="mt-3"
          />
        )}
      </section>

      {/* Admins */}
      {adminUsers.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">এডমিন ({adminUsers.length})</h2>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-bold">
                    নাম
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    যোগাযোগ
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    রেজিস্ট্রেশন
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {adminUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-fg/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <UserCircle2 className="h-4 w-4" aria-hidden />
                        </span>
                        <p className="font-semibold">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <a href={`tel:${user.phone}`} className="flex items-center gap-1.5 text-xs hover:text-brand-strong">
                          <Phone className="h-3 w-3" aria-hidden />
                          {user.phone}
                        </a>
                        {user.email && (
                          <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 text-xs text-muted hover:text-brand-strong">
                            <Mail className="h-3 w-3" aria-hidden />
                            {user.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {formatDateTime(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
