import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, Home, Loader2, SearchCheck } from "lucide-react";
import { createOrderAccessToken } from "@/lib/auth";
import { settlePayStationOrder } from "@/lib/paystation";
import { ORDER_NO_RE } from "@/lib/utils";

export const metadata: Metadata = {
  title: "পেমেন্ট যাচাই",
  robots: { index: false },
};

// Settlement queries PayStation on every visit — never prerender.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * PayStation's redirect params aren't fixed in the docs, so accept the usual
 * key names and fall back to scanning every value for our own order number
 * (SC-YYMMDD-XXXXXXXX), which is also the invoice number we initiate with.
 */
function extractInvoice(params: Record<string, string | string[] | undefined>): string | null {
  const pick = (raw: string | string[] | undefined): string | null => {
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    return value && ORDER_NO_RE.test(value) ? value : null;
  };

  for (const key of ["invoice_number", "invoice", "invoiceNumber", "order_no"]) {
    const found = pick(params[key]);
    if (found) return found;
  }
  for (const value of Object.values(params)) {
    const found = pick(value);
    if (found) return found;
  }
  return null;
}

function Notice({
  icon,
  tone,
  title,
  body,
  refresh,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  body: string;
  refresh?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="container-page py-16">
      {/* Auto re-verify while the gateway is still settling. */}
      {refresh ? <meta httpEquiv="refresh" content="3" /> : null}
      <div className="card mx-auto max-w-lg p-8 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone}`}>
          {icon}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/track" className="btn btn-ghost">
            অর্ডার ট্র্যাক
          </Link>
          <Link href="/" className="btn btn-primary">
            <Home className="h-4 w-4" /> হোম
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Where PayStation sends the customer back after hosted checkout.
 *
 * The redirect is NOT trusted: we re-verify the invoice through the
 * transaction-status API before the order is marked paid (the IPN does the
 * same from the server side — whichever lands first settles the order).
 */
export default async function PayStationCallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const invoice = extractInvoice(params);

  if (!invoice) {
    return (
      <Notice
        icon={<AlertTriangle className="h-7 w-7" />}
        tone="bg-amber-500/15 text-amber-600"
        title="পেমেন্ট সম্পন্ন হয়েছে কিনা বোঝা যায়নি"
        body="PayStation থেকে ফিরতো আসার সময় অর্ডার আইডি পাওয়া যায়নি। অর্ডার ট্র্যাক পেজ থেকে স্ট্যাটাস দেখুন — পেমেন্ট সফল হলে স্বয়ংক্রিয়ভাবে Update হবে।"
      />
    );
  }

  const result = await settlePayStationOrder(invoice, { source: "callback" });

  if (result.ok && result.order?.payment_status === "paid") {
    redirect(
      `/order/success?${new URLSearchParams({
        no: result.order.order_no,
        token: createOrderAccessToken(result.order.id),
      }).toString()}`,
    );
  }

  if (result.reason === "refunded") {
    return (
      <Notice
        icon={<AlertTriangle className="h-7 w-7" />}
        tone="bg-rose-500/15 text-rose-600"
        title="পেমেন্ট ফেরত দেওয়া হয়েছে"
        body={`অর্ডার ${invoice} এর পেমেন্ট রিফান্ড করা হয়েছে। বিস্তারিত জানতে আমাদের সাথে যোগাযোগ করুন।`}
      />
    );
  }

  if (result.reason === "processing" || result.reason === "api_error" || result.reason === "not_configured") {
    return (
      <Notice
        icon={<Loader2 className="h-7 w-7 animate-spin" />}
        tone="bg-brand/10 text-brand"
        title="পেমেন্ট যাচাই চলছে…"
        body={`অর্ডার ${invoice} এর পেমেন্টের ফলাফল যাচাই করা হচ্ছে। এই পেজটি কয়েক সেকেন্ড পর নিজে থেকেই আপডেট হবে।`}
        refresh
      />
    );
  }

  if (result.reason === "amount_mismatch") {
    return (
      <Notice
        icon={<AlertTriangle className="h-7 w-7" />}
        tone="bg-rose-500/15 text-rose-600"
        title="পেমেন্ট পরিমাণ মিলছে না"
        body={`অর্ডার ${invoice} এর সাথে গেটওয়ের পেমেন্ট পরিমাণ মিলছে না। অনুগ্রহ করে WhatsApp এ যোগাযোগ করুন।`}
      />
    );
  }

  if (result.reason === "unknown_invoice" || result.reason === "not_paystation") {
    return (
      <Notice
        icon={<SearchCheck className="h-7 w-7" />}
        tone="bg-amber-500/15 text-amber-600"
        title="অর্ডার পাওয়া যায়নি"
        body={`"${invoice}" নম্বরের কোনো PayStation অর্ডার আমরা খুঁজে পাইনি। অর্ডার ট্র্যাক পেজ থেকে দেখুন অথবা WhatsApp এ যোগাযোগ করুন।`}
      />
    );
  }

  // failed / not_success
  return (
    <Notice
      icon={<Clock className="h-7 w-7" />}
      tone="bg-rose-500/15 text-rose-600"
      title="পেমেন্ট সম্পন্ন হয়নি"
      body={`অর্ডার ${invoice} এর পেমেন্টটি সফল হয়নি (বা এখনো অসম্পূর্ণ)। আপনি চাইলে আবার চেষ্টা করতে পারেন — অর্ডারটি অপেক্ষমাণ আছে।`}
    >
      <Link href="/order" className="btn btn-primary">
        আবার চেষ্টা করুন
      </Link>
    </Notice>
  );
}
