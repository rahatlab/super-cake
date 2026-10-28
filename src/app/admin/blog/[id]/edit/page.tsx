import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getStore } from "@/lib/store";
import { PostForm } from "@/components/admin/post-form";

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const posts = await getStore().listPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> ব্লগ লিস্ট
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold">এডিট — {post.title}</h1>
          <p className="mt-1 text-xs text-muted">/blog/{post.slug}</p>
        </div>

        {post.is_published && (
          <Link href={`/blog/${post.slug}`} target="_blank" className="btn btn-soft btn-sm">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> সাইটে দেখুন
          </Link>
        )}
      </div>

      <PostForm post={post} />
    </div>
  );
}
