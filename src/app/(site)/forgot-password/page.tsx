import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/reset-form";

export const metadata: Metadata = {
  title: "পাসওয়ার্ড রিসেট",
  description: "ফোন নম্বর যাচাই করে Super Cake অ্যাকাউন্টের পাসওয়ার্ড রিসেট করুন।",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false },
};

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/account");

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
