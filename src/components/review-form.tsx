"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, PartyPopper, Send, Star } from "lucide-react";
import { submitReviewAction, type ReviewState } from "@/lib/actions/order";
import { StarInput } from "@/components/star-rating";

const initialState: ReviewState = {};

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

        <h2 className="mt-4 text-2xl font-extrabold">অনেক ধন্যবাদ! 🎉</h2>
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

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg btn-block">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> পাঠানো হচ্ছে…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> রিভিউ জমা দিন
            <Star className="h-4 w-4 fill-current" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-muted">
        আপনার রিভিউ admin approval-এর পর ওয়েবসাইটে প্রকাশিত হবে।
      </p>
    </form>
  );
}
