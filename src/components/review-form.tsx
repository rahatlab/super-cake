"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useActionState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cancel01, ImageAdd01, Loading01, Send, Star } from "@animateicons/react/huge";
import { PartyPopper } from "lucide-react";
import { submitReviewAction, type ReviewState } from "@/lib/actions/order";
import { StarInput } from "@/components/star-rating";
import { AnimIcon } from "@/components/ui/anim-icon";
import { MAX_REVIEW_PHOTOS } from "@/lib/constants";
import { useAnimIcon } from "@/components/ui/use-anim-icon";

const initialState: ReviewState = {};
const MAX_BYTES = 5 * 1024 * 1024;

interface Picked {
  file: File;
  url: string;
}

export function ReviewForm({
  orderId,
  customerName,
  cakeSlug,
  accessToken,
}: {
  orderId: string;
  customerName: string;
  cakeSlug: string | null;
  accessToken: string;
}) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // AnimateIcons refs for review form icons
  const addPhotoIcon = useAnimIcon();
  const removePhotoIcon = useAnimIcon();
  const submitIcon = useAnimIcon();

  /** Keep the native <input type="file"> in sync with our removable list. */
  const setFiles = (next: Picked[]) => {
    const dt = new DataTransfer();
    next.forEach((p) => dt.items.add(p.file));
    if (inputRef.current) inputRef.current.files = dt.files;
    setPhotos(next);
  };

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    if (!chosen.length) return;

    setPhotoError(null);

    const tooBig = chosen.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setPhotoError(`${tooBig.name} — সর্বোচ্চ ৫MB`);
      setFiles([]);
      return;
    }

    if (chosen.length > MAX_REVIEW_PHOTOS) {
      setPhotoError(`সর্বোচ্চ ${MAX_REVIEW_PHOTOS} টি ছবি দেওয়া যাবে`);
    }

    const trimmed = chosen.slice(0, MAX_REVIEW_PHOTOS);
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setFiles(trimmed.map((file) => ({ file, url: URL.createObjectURL(file) })));
  };

  const removePhoto = (index: number) => {
    const target = photos[index];
    if (target) URL.revokeObjectURL(target.url);
    setFiles(photos.filter((_, i) => i !== index));
  };

  if (state.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="card p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 13, delay: 0.15 }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand to-accent"
        >
          <PartyPopper className="h-8 w-8 text-white" />
        </motion.div>

        <h2 className="mt-4 text-2xl font-extrabold">অনেক ধন্যবাদ! <AnimIcon name="sparkles" className="h-4 w-4 shrink-0" /></h2>
        <p className="mt-2 text-sm text-muted">
          আপনার রিভিউ জমা হয়েছে। Admin approval-এর পর এটি ওয়েবসাইটে প্রকাশিত হবে।
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/cakes" className="btn btn-primary btn-sm">
            আরও কেক দেখুন
          </Link>
          <Link href="/" className="btn btn-ghost btn-sm">
            হোমে ফিরুন
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="access_token" value={accessToken} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="cake_slug" value={cakeSlug ?? ""} />

      <div>
        <span className="label">আপনার রেটিং *</span>
        <StarInput value={rating} onChange={setRating} />
        <p className="mt-1.5 text-xs text-muted">
          {["দুঃখজনক", "ভালো না", "ঠিক আছে", "খুব ভালো", "চমৎকার 🎂"][Math.min(4, rating - 1)]}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="customer_name">আপনার নাম</label>
        <input
          id="customer_name"
          name="customer_name"
          className="field"
          minLength={2}
          defaultValue={customerName}
          placeholder="নাম লিখুন"
        />
      </div>

      <div>
        <label className="label" htmlFor="comment">অভিজ্ঞতা লিখুন *</label>
        <textarea
          id="comment"
          name="comment"
          required
          minLength={3}
          maxLength={500}
          rows={5}
          className="field resize-y"
          placeholder="কেক কেমন ছিল? ডেলিভারি? পরেরবার আবার নিবেন? কিছু লিখুন ✍️"
        />
        <p className="mt-1 text-right text-[11px] text-muted">কমপক্ষে ৩ অক্ষর</p>
      </div>

      {/* photos */}
      <div>
        <span className="label">কেকের ছবি (ঐচ্ছিক)</span>
        <input
          ref={inputRef}
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="sr-only"
          onChange={pick}
        />

        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                <Image
                  src={p.url}
                  alt={`Review photo ${i + 1}`}
                  fill
                  unoptimized
                  sizes="120px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`ছবি ${i + 1} মুছুন`}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                  onMouseEnter={() => removePhotoIcon.current?.startAnimation()}
                  onMouseLeave={() => removePhotoIcon.current?.stopAnimation()}
                >
                  <Cancel01 ref={removePhotoIcon} className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= MAX_REVIEW_PHOTOS}
          className="btn btn-ghost btn-sm"
          onMouseEnter={() => addPhotoIcon.current?.startAnimation()}
          onMouseLeave={() => addPhotoIcon.current?.stopAnimation()}
        >
          <ImageAdd01 ref={addPhotoIcon} className="h-4 w-4" />
          {photos.length ? "আরও ছবি যোগ করুন" : "ছবি যোগ করুন"}
        </button>
        <p className="mt-1.5 text-[11px] text-muted">
          সর্বোচ্চ {MAX_REVIEW_PHOTOS} টি ছবি · প্রতিটি ৫MB · JPG, PNG, WEBP, GIF বা AVIF
        </p>

        {photoError && <p className="mt-1 text-xs font-semibold text-danger">{photoError}</p>}
      </div>

      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block" onMouseEnter={() => submitIcon.current?.startAnimation()} onMouseLeave={() => submitIcon.current?.stopAnimation()}>
        {pending ? (
          <>
            <Loading01 ref={submitIcon} className="h-4 w-4 animate-spin" /> পাঠানো হচ্ছে…
          </>
        ) : (
          <>
            <Send ref={submitIcon} className="h-4 w-4" /> রিভিউ জমা দিন
            <Star ref={submitIcon} className="h-4 w-4 fill-current" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-muted">
        আপনার রিভিউ admin approval-এর পর ওয়েবসাইটে প্রকাশিত হবে।
      </p>
    </form>
  );
}
