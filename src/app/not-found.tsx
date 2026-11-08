import Link from "next/link";
import { AnimIcon } from "@/components/ui/anim-icon";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <AnimIcon name="cake" className="animate-float h-16 w-16" />
      <p className="mt-6 font-display text-6xl font-extrabold text-gradient">404</p>
      <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">এই পেজটি খুঁজে পাওয়া যায়নি</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        হয়তো লিংকটি ভুল, অথবা কেকটি আর আছে না। চিন্তা করবেন না — সুস্বাদু কেক তো আছেই! <AnimIcon name="cake" className="h-4 w-4 shrink-0" />
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary btn-lg">
          <AnimIcon name="home" className="h-4 w-4 shrink-0" /> হোমে ফিরুন
        </Link>
        <Link href="/cakes" className="btn btn-ghost btn-lg">
          <AnimIcon name="cake" className="h-4 w-4 shrink-0" /> কেক দেখুন
        </Link>
        <Link href="/track" className="btn btn-soft btn-lg">
          <AnimIcon name="box" className="h-4 w-4 shrink-0" /> অর্ডার ট্র্যাক
        </Link>
      </div>
    </div>
  );
}
