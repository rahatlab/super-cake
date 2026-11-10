"use client";

import { useEffect, useState, useActionState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Cancel01, ImageAdd01, Loading01, Save } from "@animateicons/react/huge";
import { savePostAction, uploadImagesAction, type ActionState } from "@/lib/actions/admin";
import type { BlogPost } from "@/lib/types";
import { useAnimIcon } from "@/components/ui/use-anim-icon";
import { AnimIcon } from "@/components/ui/anim-icon";
import { OrderLoadingOverlay } from "@/components/order/order-loading-overlay";

const initial: ActionState = {};

export function PostForm({ post }: { post?: BlogPost }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(savePostAction, initial);
  const [cover, setCover] = useState(post?.cover_image ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const busy = pending || uploading;
  // AnimateIcons refs for post form icons
  const saveIcon = useAnimIcon();
  const removeCoverIcon = useAnimIcon();
  const uploadIcon = useAnimIcon();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.push("/admin/blog");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

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
            <AnimIcon name="alert" className="h-4 w-4 shrink-0" /> {state.error}
          </p>
        )}
        <OrderLoadingOverlay
          show={busy}
          message={uploading ? "ছবি আপলোড হচ্ছে…" : "ব্লগ সেভ হচ্ছে…"}
        />

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
            <label htmlFor="post-slug" className="label">
              Slug (URL)
            </label>
            <input
              id="post-slug"
              name="slug"
              maxLength={160}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="field"
              placeholder="যেমন: cake-order-guide"
              aria-describedby="post-slug-hint"
            />
            <p id="post-slug-hint" className="mt-1 font-mono text-[11px] text-muted">
              /blog/{slug || "…"} — খালি রাখলে টাইটেল থেকে তৈরি হবে; শুধু অক্ষর, সংখ্যা ওহাইফেন (-)
            </p>
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

          <button type="submit" disabled={pending || uploading} className="btn btn-primary btn-block" onMouseEnter={() => saveIcon.current?.startAnimation()} onMouseLeave={() => saveIcon.current?.stopAnimation()}>
            {pending ? (
              <Loading01 ref={saveIcon} className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save ref={saveIcon} className="h-4 w-4" aria-hidden />
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
              <Image
                src={cover}
                alt={post?.title ?? "কভার ছবি"}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setCover("")}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="কভার ছবি সরান"
                onMouseEnter={() => removeCoverIcon.current?.startAnimation()}
                onMouseLeave={() => removeCoverIcon.current?.stopAnimation()}
              >
                <Cancel01 ref={removeCoverIcon} className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-xl border border-dashed border-line bg-bg text-center">
              <div>
                <ImageAdd01 ref={uploadIcon} className="mx-auto h-6 w-6 text-muted" aria-hidden />
                <p className="mt-1 text-[11px] text-muted">কোনো ছবি নেই</p>
              </div>
            </div>
          )}

          <label
            className="btn btn-soft btn-sm w-full cursor-pointer"
            onMouseEnter={() => uploadIcon.current?.startAnimation()}
            onMouseLeave={() => uploadIcon.current?.stopAnimation()}
          >
            {uploading ? (
              <Loading01 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImageAdd01 ref={uploadIcon} className="h-3.5 w-3.5" aria-hidden />
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
              <AnimIcon name="alert" className="h-4 w-4 shrink-0" /> {uploadError}
            </p>
          )}
        </section>
      </aside>
    </form>
  );
}
