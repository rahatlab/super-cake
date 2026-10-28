import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { getStore } from "@/lib/store";
import { cn, formatDate } from "@/lib/utils";
import { PostRowActions } from "@/components/admin/post-row-actions";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const posts = await getStore().listPosts();
  const sorted = [...posts].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  const published = sorted.filter((p) => p.is_published).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">ব্লগ</h1>
          <p className="mt-1 text-sm text-muted">
            {sorted.length} টি পোস্ট · {published} টি প্রকাশিত — SEO ফ্রেন্ডলি কন্টেন্ট লিখুন
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
          <Plus className="h-4 w-4" aria-hidden /> নতুন পোস্ট
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="card grid place-items-center gap-3 px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            ✍️
          </span>
          <p className="font-bold">এখনো কোনো ব্লগ পোস্ট নেই</p>
          <p className="max-w-sm text-sm text-muted">
            প্রথম পোস্ট লিখুন — কেকের টিপস, রেসিপি বা অফারের খবর। Google-এ ট্রাফিক বাড়াতে সাহায্য করবে।
          </p>
          <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" aria-hidden /> নতুন পোস্ট
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th scope="col" className="px-4 py-3 font-bold">
                  পোস্ট
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  স্ট্যাটাস
                </th>
                <th scope="col" className="px-4 py-3 font-bold">
                  তারিখ
                </th>
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  অ্যাকশন
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((p) => (
                <tr key={p.id} className="align-top transition-colors hover:bg-fg/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-brand/10">
                        {p.cover_image ? (
                          <Image
                            src={p.cover_image}
                            alt={p.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-lg" aria-hidden>
                            📝
                          </span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold">{p.title}</p>
                        <p className="mt-0.5 line-clamp-1 max-w-md text-[11px] text-muted">
                          /blog/{p.slug}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "badge",
                        p.is_published
                          ? "bg-success/15 text-success"
                          : "bg-line/60 text-muted",
                      )}
                    >
                      {p.is_published ? "প্রকাশিত" : "ড্রাফট"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(p.published_at ?? p.created_at)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        {p.is_published && (
                          <Link
                            href={`/blog/${p.slug}`}
                            target="_blank"
                            className="btn btn-ghost btn-sm"
                            aria-label={`${p.title} সাইটে দেখুন`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        )}
                        <Link href={`/admin/blog/${p.id}/edit`} className="btn btn-soft btn-sm">
                          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                        </Link>
                      </div>
                      <PostRowActions postId={p.id} title={p.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
