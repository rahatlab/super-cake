import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, CalendarDays } from "lucide-react";
import { getStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { breadcrumbLd, ldJson, websiteLd } from "@/lib/seo";
import { ReadingTime } from "@/components/markdown";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "ব্লগ — কেক টিপস, ট্রেন্ড ও গাইড",
  description:
    "কেক অর্ডার গাইড, birthday cake trend, bKash payment নির্দেশনা ও মিষ্টি টিপস — Super Cake ব্লগের সব পোস্ট।",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "ব্লগ | Super Cake",
    description: "কেক অর্ডার গাইড ও ট্রেন্ডের সব পোস্ট",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogPage() {
  const store = getStore();
  const [posts, settings] = await Promise.all([
    store.listPosts({ publishedOnly: true }),
    store.getSettings(),
  ]);

  const [featured, ...rest] = posts;

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "ব্লগ", item: "/blog" },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(websiteLd(settings)) }}
      />

      <header className="mx-auto max-w-2xl text-center">
        <span className="badge bg-brand/12 text-brand-strong">📖 Blog</span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          মিষ্টি <span className="text-gradient">খবর ও টিপস</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          কেক কিভাবে বাছবেন, কিভাবে অর্ডার করবেন, আর চলতি trend — সব এক জায়গায়।
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="card mt-10 px-6 py-16 text-center">
          <span className="text-5xl">✍️</span>
          <h2 className="mt-3 text-lg font-bold">এখনো কোনো পোস্ট প্রকাশিত হয়নি</h2>
          <p className="mt-1 text-sm text-muted">শীঘ্রই নতুন লেখা আসছে — অপেক্ষা করুন!</p>
        </div>
      ) : (
        <div className="mt-9 space-y-8">
          {/* featured */}
          <Reveal>
            <Link
              href={`/blog/${featured.slug}`}
              className="card group grid overflow-hidden md:grid-cols-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-brand/8 md:aspect-auto md:min-h-72">
                {featured.cover_image && (
                  <Image
                    src={featured.cover_image}
                    alt={featured.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <span className="badge w-fit bg-brand text-brand-fg">সাম্প্রতিক</span>
                <h2 className="mt-4 text-2xl font-extrabold leading-snug transition-colors group-hover:text-brand-strong sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">
                  {featured.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {featured.published_at ? formatDate(featured.published_at) : ""}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <ReadingTime text={featured.content} />
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>

          {/* rest */}
          {rest.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.07}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="card group flex h-full flex-col overflow-hidden"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-brand/8">
                      {p.cover_image && (
                        <Image
                          src={p.cover_image}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-brand-strong">
                        {p.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">
                        {p.excerpt}
                      </p>
                      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-[11px] text-muted">
                        <span>{p.published_at ? formatDate(p.published_at) : ""}</span>
                        <span>·</span>
                        <ReadingTime text={p.content} />
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
