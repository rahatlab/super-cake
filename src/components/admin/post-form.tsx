"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { savePostAction, uploadImagesAction, type ActionState } from "@/lib/actions/admin";
import type { BlogPost } from "@/lib/types";

const initial: ActionState = {};

export function PostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(savePostAction, initial);
  const [cover, setCover] = useState(post?.cover_image ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!state.success) return;
    if (post) {
      router.refresh();
    } else if (state.id) {
      router.push(`/admin/blog/${state.id}/edit`);
    } else {
      router.push("/admin/blog");
    }
  }, [state.success, state.id, post, router]);

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("images", file);
    const res = await uploadImagesAction(fd);
    setUploading(false);
    e.target.value = "";
    if (res.error || !res.urls[0]) {
      setUploadError(res.error ?? "আপলোড ব্যর্থ হয়েছে");
      return;
    }
    setCover(res.urls[0]);
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="cover_image" value={cover} />

      {/* ---------------- main content ---------------- */}
      <div className="space-y-4">
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
            ⚠️ {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="rounded-xl bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            ✅ {state.success}
          </p>
        )}

        <section className="card space-y-4 p-5">
          <div>
            <label htmlFor="post-title" className="label">
              টাইটেল *
            </label>
            <input
              id="post-title"
              name="title"
              required
              minLength={3}
              maxLength={160}
              defaultValue={post?.title ?? ""}
              className="field"
              placeholder="যেমন: নিখুঁত জন্মদিনের কেক বাছাই করার ৫ টি টিপস"
            />
          </div>

          <div>
            <label htmlFor="post-excerpt" className="label">
              সংক্ষিপ্ত সারাংশ
            </label>
            <textarea
              id="post-excerpt"
              name="excerpt"
              rows={3}
              maxLength={300}
              defaultValue={post?.excerpt ?? ""}
              className="field resize-y"
              placeholder="ব্লগ লিস্টে ও সার্চ রেজাল্টে এই লেখাটা দেখাবে"
            />
          </div>

          <div>
            <label htmlFor="post-content" className="label">
              কন্টেন্ট * (Markdown)
            </label>
            <textarea
              id="post-content"
              name="content"
              required
              minLength={10}
              rows={18}
              defaultValue={post?.content ?? ""}
              className="field resize-y font-mono text-[13px] leading-relaxed"
              placeholder={"## ছোট হেডিং\n\nসাধারণ প্যারাগ্রাফ…\n\n- বুলেট পয়েন্ট\n- আরেকটা পয়েন্ট\n\n**বোল্ড** লেখা যায়"}
            />
            <p className="mt-1 text-[11px] text-muted">
              ## হেডিং · **বোল্ড** · - বুলেট · &gt; কোট · [লিংক](https://…) সাপোর্ট করে
            </p>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">SEO</h2>
          <div>
            <label htmlFor="post-meta-title" className="label">
              Meta title
            </label>
            <input
              id="post-meta-title"
              name="meta_title"
              maxLength={160}
              defaultValue={post?.meta_title ?? ""}
              className="field"
              placeholder="খালি রাখলে টাইটেল ব্যবহার হবে"
            />
          </div>
          <div>
            <label htmlFor="post-meta-desc" className="label">
              Meta description
            </label>
            <textarea
              id="post-meta-desc"
              name="meta_description"
              rows={3}
              maxLength={300}
              defaultValue={post?.meta_description ?? ""}
              className="field resize-y"
              placeholder="খালি রাখলে সারাংশ ব্যবহার হবে"
            />
          </div>
        </section>
      </div>

      {/* ---------------- sidebar ---------------- */}
      <aside className="space-y-4">
        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">প্রকাশ</h2>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-3">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={post ? post.is_published : true}
              className="h-4 w-4 accent-[hsl(var(--brand))]"
            />
            <span className="text-sm font-semibold">সাইটে প্রকাশ করুন</span>
          </label>

          <button type="submit" disabled={pending || uploading} className="btn btn-primary btn-block">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            {post ? "আপডেট করুন" : "ব্লগ তৈরি করুন"}
          </button>

          {post && (
            <p className="text-[11px] text-muted">
              তৈরি: {new Date(post.created_at).toLocaleDateString("en-BD")}
              {post.slug ? ` · /blog/${post.slug}` : ""}
            </p>
          )}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">কভার ছবি</h2>

          {cover ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-brand/10">
              <Image src={cover} alt="কভার প্রিভিউ" fill sizes="400px" className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => setCover("")}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="কভার ছবি সরান"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-line bg-bg text-center">
              <div>
                <ImagePlus className="mx-auto h-6 w-6 text-muted" aria-hidden />
                <p className="mt-1 text-[11px] text-muted">কোনো ছবি নেই</p>
              </div>
            </div>
          )}

          <label className="btn btn-soft btn-sm w-full cursor-pointer">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
            )}
            ছবি আপলোড
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="sr-only"
              onChange={onPickCover}
              disabled={uploading}
            />
          </label>

          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            className="field text-xs"
            placeholder="অথবা ইমেজ URL পেস্ট করুন"
            aria-label="কভার ইমেজ URL"
          />

          {uploadError && (
            <p role="alert" className="text-[11px] font-semibold text-danger">
              ⚠️ {uploadError}
            </p>
          )}
        </section>
      </aside>
    </form>
  );
}
