import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/components/admin/post-form";

export const metadata: Metadata = { title: "New Post" };

export default function NewPostPage() {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> ব্লগ লিস্ট
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">নতুন ব্লগ পোস্ট</h1>
        <p className="mt-1 text-sm text-muted">
          টাইটেল, কন্টেন্ট ও কভার ছবি দিন — প্রকাশ করলে সাথে সাথে সাইটে চলে যাবে
        </p>
      </div>

      <PostForm />
    </div>
  );
}
