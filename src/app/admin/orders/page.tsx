import type { Metadata } from "next";
import { getStore } from "@/lib/store";
import { OrdersTable } from "@/components/admin/orders-table";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage() {
  const orders = await getStore().listOrders();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">অর্ডার</h1>
        <p className="mt-1 text-sm text-muted">
          সব অর্ডার এক জায়গায় — স্ট্যাটাস বদলাতে অর্ডারে ক্লিক করুন
        </p>
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
