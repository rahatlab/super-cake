"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { CATEGORIES, FLAVORS, MAX_CAKE_IMAGES, OCCASIONS, WEIGHTS } from "@/lib/constants";
import { formatBDT, weightLabel } from "@/lib/utils";
import { saveCakeAction, uploadImagesAction, type ActionState } from "@/lib/actions/admin";
import { compressImageFile } from "@/lib/compress-image";
import type { Cake, Occasion } from "@/lib/types";

interface SizeRow {
  weight: number;
  price: number;
  is_available: boolean;
}

export function CakeForm({ cake }: { cake?: Cake }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveCakeAction, {} as ActionState);

  const [occasions, setOccasions] = useState<Occasion[]>(cake?.occasions ?? []);
  const [sizes, setSizes] = useState<SizeRow[]>(
    WEIGHTS.map((w) => {
      const existing = cake?.sizes?.find((s) => s.weight === w);
      return {
        weight: w,
        price: existing?.price ?? (w === 1 ? cake?.base_price ?? 0 : 0),
        is_available: existing?.is_available ?? w === 1,
      };
    }),
  );
  const [images, setImages] = useState<string[]>(cake?.image_urls ?? []);
  const [urlText, setUrlText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [desc, setDesc] = useState(cake?.description ?? "");
  const [imageFit, setImageFit] = useState<"cover" | "contain">(cake?.image_fit ?? "contain");
  const [imagePosition, setImagePosition] = useState<"center" | "top" | "bottom">(cake?.image_position ?? "center");
  const [previewDims, setPreviewDims] = useState<Record<string, string>>({});

  /**
   * Synchronous double-submit lock. React state (`pending`) only flips after a
   * re-render, so two clicks inside the same frame both reached `formAction`
   * and created the cake twice. The ref is read/written before any `await`, so
   * the second click is rejected in the same tick.
   */
  const submitLock = useRef(false);

  // The action has settled (state is a fresh object per call) — allow saving
  // again. Early validation failures release the lock in onSubmit's finally.
  useEffect(() => {
    submitLock.current = false;
  }, [state]);

  const basePrice =
    sizes.find((s) => s.weight === 1)?.price || sizes.find((s) => s.price > 0)?.price || 0;

  function toggleOccasion(value: Occasion) {
    setOccasions((prev) =>
      prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value],
    );
  }

  function updateSize(weight: number, patch: Partial<SizeRow>) {
    setSizes((prev) => prev.map((s) => (s.weight === weight ? { ...s, ...patch } : s)));
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Synchronous re-entry guard. `disabled={busy}` only flips after React
    // re-renders, so two clicks inside the same tick both dispatched the save
    // and created the cake twice. A ref is read/written before any await, so
    // the second click is dropped immediately.
    if (submitLock.current) return;
    submitLock.current = true;

    const fd = new FormData(e.currentTarget);
    setUploadError("");

    let urls = [...images];
    let dispatched = false;

    try {
      // 1. upload any picked files first
      const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
      if (files.length) {
        // Bail before uploading — the validator would reject the save anyway.
        if (images.length + files.length > MAX_CAKE_IMAGES) {
          setUploadError(
            `সর্বোচ্চ ${MAX_CAKE_IMAGES} টি ছবি রাখা যায় — আপনার ইতিমধ্যে ${images.length} টি আছে। আগে কিছু মুছে ফেলুন।`,
          );
          return;
        }
        setUploading(true);
        const up = new FormData();
        for (const f of files) up.append("images", await compressImageFile(f));
        const res = await uploadImagesAction(up);
        setUploading(false);
        if (res.error) {
          setUploadError(res.error);
          return;
        }
        urls = [...urls, ...res.urls];
      }

      // 2. merge manually pasted URLs
      const pasted = urlText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      urls = Array.from(new Set([...urls, ...pasted]));

      if (!urls.length) {
        setUploadError("অন্তত একটা ছবি দিন — ফাইল আপলোড অথবা ইমেজ URL");
        return;
      }

      if (urls.length > MAX_CAKE_IMAGES) {
        setUploadError(
          `সর্বোচ্চ ${MAX_CAKE_IMAGES} টি ছবি রাখা যায় — এখন ${urls.length} টি হয়ে গেছে। কিছু মুছে ফেলুন।`,
        );
        return;
      }

      // 3. sync JSON hidden fields and dispatch the save action
      fd.set("image_urls", JSON.stringify(urls));
      fd.set("occasions", JSON.stringify(occasions));
      fd.set("sizes", JSON.stringify(sizes.filter((s) => s.price > 0)));
      fd.set("base_price", String(basePrice));
      fd.set("image_fit", imageFit);
      fd.set("image_position", imagePosition);
      setImages(urls);

      dispatched = true;
      startTransition(() => {
        formAction(fd);
      });
    } finally {
      // Validation failures never dispatch an action, so nothing would ever
      // flip the lock back — release it here. A real save keeps the lock until
      // the action settles (see the useEffect on `state` above).
      if (!dispatched) submitLock.current = false;
    }
  }

  const busy = uploading || pending;

  // Confirmation toast for the save result (react-toastify).
  useEffect(() => {
    if (state.success) toast.success(state.success);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-6">
      {/* result banners */}
      {state.success && (
        <div className="card flex flex-wrap items-center gap-3 border-success/40 bg-success/5 p-4">
          <p className="flex-1 text-sm font-bold text-success">✅ {state.success}</p>
          <Link href="/admin/cakes" className="btn btn-soft btn-sm">
            কেক লিস্টে ফিরুন
          </Link>
          {state.id && (
            <button type="button" onClick={() => router.refresh()} className="btn btn-ghost btn-sm">
              আবার এডিট
            </button>
          )}
        </div>
      )}
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {state.error}
        </p>
      )}
      {uploadError && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          ⚠️ {uploadError}
        </p>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* ---------------- basic info ---------------- */}
        <div className="card space-y-4 p-5">
          <h2 className="text-base font-extrabold">Basic Info</h2>

          <input type="hidden" name="id" value={cake?.id ?? ""} />
          <input type="hidden" name="base_price" value={basePrice} />

          <div>
            <label htmlFor="cake-name" className="label">
              কেকের নাম *
            </label>
            <input id="cake-name" name="name" required defaultValue={cake?.name ?? ""} className="field" placeholder="যেমন: Chocolate Truffle Dream" />
          </div>

          <div>
            <label htmlFor="cake-desc" className="label">
              Description
            </label>
            <textarea
              id="cake-desc"
              name="description"
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="field"
              placeholder="উপকরণ, স্বাদ, ডেকোরেশন সম্পর্কে লিখুন…"
            />
            <p className="mt-1 text-xs text-muted">সর্বোচ্চ ৬০০ অক্ষর</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cake-flavor" className="label">
                Flavour *
              </label>
              <input id="cake-flavor" name="flavor" required list="flavor-options" defaultValue={cake?.flavor ?? ""} className="field" placeholder="Chocolate Truffle" />
              <datalist id="flavor-options">
                {FLAVORS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="cake-category" className="label">
                Category *
              </label>
              <select id="cake-category" name="category" required defaultValue={cake?.category ?? CATEGORIES[0]} className="field">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="label">Occasion * (অন্তত একটি)</span>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleOccasion(o.value)}
                  aria-pressed={occasions.includes(o.value)}
                  data-active={occasions.includes(o.value)}
                  className="chip"
                >
                  {o.emoji} {o.bn}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cake-stock" className="label">
                Stock
              </label>
              <input id="cake-stock" name="stock" type="number" min={0} defaultValue={cake?.stock ?? 10} className="field" />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="is_featured" defaultChecked={cake?.is_featured} className="h-4 w-4 accent-brand" />
                ⭐ Featured (হোমপেজে দেখাবে)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="is_custom_available" defaultChecked={cake?.is_custom_available} className="h-4 w-4 accent-brand" />
                ✏️ Custom অর্ডার নেওয়া হবে
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="is_active" defaultChecked={cake?.is_active ?? true} className="h-4 w-4 accent-brand" />
                ✅ Active (সেলে দেখাবে)
              </label>
            </div>
          </div>
        </div>

        {/* ---------------- sizes ---------------- */}
        <div className="card space-y-4 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold">Weight Sizes</h2>
            <p className="text-xs text-muted">Base price: <strong className="text-fg">{formatBDT(basePrice)}</strong> (1 lb থেকে অটো)</p>
          </div>

          <div className="space-y-2">
            {sizes.map((s) => (
              <div key={s.weight} className="flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5">
                <span className="w-20 text-sm font-bold">{weightLabel(s.weight)}</span>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">৳</span>
                  <input
                    type="number"
                    min={0}
                    value={s.price || ""}
                    onChange={(e) => updateSize(s.weight, { price: Number(e.target.value) || 0 })}
                    aria-label={`${weightLabel(s.weight)} এর দাম`}
                    className="field pl-7"
                    placeholder="দাম"
                  />
                </div>
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={s.is_available}
                    onChange={(e) => updateSize(s.weight, { is_available: e.target.checked })}
                    className="h-4 w-4 accent-brand"
                  />
                  Available
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">০ টাকা দামের সাইজ সেভ হবে না। না দাম দিলে ওই সাইজ বাদ যাবে।</p>
        </div>

        {/* ---------------- images ---------------- */}
        <div className="card space-y-4 p-5 lg:col-span-2">
          <h2 className="text-base font-extrabold">ছবি / Images *</h2>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((url) => (
                <div key={url} className="relative">
                  <Image
                    src={url}
                    alt="কেকের ছবি"
                    width={96}
                    height={96}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setPreviewDims((prev) =>
                        prev[url] ? prev : { ...prev, [url]: `${img.naturalWidth}×${img.naturalHeight}` },
                      );
                    }}
                    className={`h-24 w-24 rounded-xl border border-line ${imageFit === "contain" ? "object-contain bg-surface" : "object-cover"}`}
                  />
                  {previewDims[url] && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {previewDims[url]}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    aria-label={`ছবি মুছুন ${url}`}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-danger text-white shadow-soft"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">ছবির ফিট</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageFit("contain")}
                  aria-pressed={imageFit === "contain"}
                  className={`chip ${imageFit === "contain" ? "!border-brand !bg-brand/10" : ""}`}
                >
                  পুরো দেখাবে (Full visible)
                </button>
                <button
                  type="button"
                  onClick={() => setImageFit("cover")}
                  aria-pressed={imageFit === "cover"}
                  className={`chip ${imageFit === "cover" ? "!border-brand !bg-brand/10" : ""}`}
                >
                  ফ্রেম ভরবে (Fill frame)
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">Full visible হলে পুরো কেক দেখাবে, কাটবে না।</p>
            </div>
            <div>
              <label htmlFor="image-position" className="label">
                অবস্থান
              </label>
              <select
                id="image-position"
                value={imagePosition}
                onChange={(e) => setImagePosition(e.target.value as "center" | "top" | "bottom")}
                className="field"
              >
                <option value="center">মাঝখানে (Center)</option>
                <option value="top">উপরে (Top)</option>
                <option value="bottom">নিচে (Bottom)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="cake-images" className="label">
              ফাইল আপলোড (একাধিক হতে পারে)
            </label>
            <input id="cake-images" type="file" name="images" multiple accept="image/*" className="field" />
            <p className="mt-1 text-xs text-muted">সর্বোচ্চ ৫MB per file — JPG / PNG / WEBP / GIF / AVIF। বড় ছবি আপলোডের আগে অটো ছোট হবে (সর্বোচ্চ ১৬০০px)।</p>
          </div>

          <div>
            <label htmlFor="cake-urls" className="label">
              অথবা ইমেজ URL (প্রতি লাইনে একটি করে)
            </label>
            <textarea
              id="cake-urls"
              rows={3}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              className="field font-mono text-xs"
              placeholder={"/uploads/chocolate-cake.jpg\nhttps://cdn.example.com/cake.png"}
            />
            <p className="mt-1 text-xs text-muted">আপলোড করা + এখানে দেওয়া URL দুটো একসাথে সেভ হবে।</p>
          </div>

          <input type="hidden" name="image_urls" value={JSON.stringify(images)} />
          <input type="hidden" name="occasions" value={JSON.stringify(occasions)} />
          <input type="hidden" name="sizes" value={JSON.stringify(sizes.filter((s) => s.price > 0))} />
        </div>

        {/* ---------------- submit ---------------- */}
        <div className="lg:col-span-2">
          <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : cake ? <Eye className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            {uploading ? "ছবি আপলোড হচ্ছে…" : pending ? "সেভ হচ্ছে…" : cake ? "কেক আপডেট করুন" : "কেক সেভ করুন"}
          </button>
        </div>
      </form>
    </div>
  );
}
