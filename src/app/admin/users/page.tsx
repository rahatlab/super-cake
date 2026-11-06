import { Suspense } from "react";
import { UserCircle2 } from "lucide-react";
import { getStore } from "@/lib/store";
import { UsersList } from "@/components/admin/users-list";

export const metadata = {
  title: "ইউজার ম্যানেজমেন্ট",
};

export default async function UsersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand-strong">
          <UserCircle2 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-extrabold">ইউজার ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted">সব রেজিস্টার্ড ইউজার দেখুন এবং ব্লক করুন</p>
        </div>
      </div>

      <Suspense fallback={<div className="card p-8 text-center text-muted">লোড হচ্ছে...</div>}>
        <UsersListWrapper />
      </Suspense>
    </div>
  );
}

async function UsersListWrapper() {
  const store = getStore();
  const users = await store.listUsers();

  // One aggregate pass per customer — matched by phone too so guest orders
  // placed with the same number are counted.
  const entries = await Promise.all(
    users.map(async (u) => [
      u.id,
      await store.getOrderStatsForUser({ userId: u.id, phone: u.phone }),
    ] as const),
  );

  return <UsersList users={users} stats={Object.fromEntries(entries)} />;
}
