import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center py-16 text-center">
      <span className="animate-float text-7xl">🍰</span>
      <p className="mt-6 font-display text-6xl font-extrabold text-gradient">404</p>
      <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">এই পেজটি খুঁজে পাওয়া যায়নি</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        হয়তো লিংকটি ভুল, অথবা কেকটি আর আছে না। চিন্তা করবেন না — সুস্বাদু কেক তো আছেই! 🎂
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary btn-lg">
          🏠 হোমে ফিরুন
        </Link>
        <Link href="/cakes" className="btn btn-ghost btn-lg">
          🎂 কেক দেখুন
        </Link>
        <Link href="/track" className="btn btn-soft btn-lg">
          📦 অর্ডার ট্র্যাক
        </Link>
      </div>
    </div>
  );
}
