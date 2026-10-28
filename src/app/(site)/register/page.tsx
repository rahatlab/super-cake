import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "রেজিস্টার",
  description: "Super Cake এ নতুন অ্যাকাউন্ট খুলুন — দ্রুত অর্ডার, ট্র্যাকিং ও রিভিউ।",
  alternates: { canonical: "/register" },
  robots: { index: false },
};

export default async function RegisterPage({
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
        <AuthForm mode="register" next={next} />
      </div>
    </div>
  );
}
