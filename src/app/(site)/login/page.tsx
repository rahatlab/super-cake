import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/store";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "লগইন",
  description: "Super Cake অ্যাকাউন্টে লগইন করুন — আপনার অর্ডার, ট্র্যাকিং ও রিভিউ এক জায়গায়।",
  alternates: { canonical: "/login" },
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) redirect(user.role === "admin" ? "/admin" : "/account");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <AuthForm
          mode="login"
          next={next}
          showDemoHint={!isSupabaseConfigured() && process.env.NODE_ENV !== "production"}
        />
      </div>
    </div>
  );
}
