import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Share2 } from "lucide-react";
import { getStore } from "@/lib/store";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { blogLd, breadcrumbLd, ldJson } from "@/lib/seo";
import { Markdown, ReadingTime } from "@/components/markdown";
import { BlogShare } from "@/components/blog-share";

interface Ctx {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = await getStore().getPostBySlug(slug);
  if (!post) return { title: "পোস্ট পাওয়া যায়নি" };

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at ?? undefined,
      url: `/blog/${post.slug}`,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
      siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: Ctx) {
  const { slug } = await params;
  const store = getStore();

  const post = await store.getPostBySlug(slug);
  if (!post || !post.is_published) notFound();

  const [settings, allPosts] = await Promise.all([
    store.getSettings(),
    store.listPosts({ publishedOnly: true }),
  ]);

  const related = allPosts.filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <article className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(blogLd(post, settings)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: ldJson(
            breadcrumbLd([
              { name: "হোম", item: "/" },
              { name: "ব্লগ", item: "/blog" },
              { name: post.title },
            ]),
          ),
        }}
      />

      <header className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-brand-strong">
          <ArrowLeft className="h-4 w-4" /> সব পোস্ট
        </Link>

        <h1 className="mt-5 text-3xl font-extrabold leading-[1.2] sm:text-4xl">{post.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {post.published_at ? formatDate(post.published_at) : ""}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>✍️</span> {settings.store_name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ReadingTime text={post.content} />
          </span>
          <BlogShare title={post.title} />
        </div>

        {post.excerpt && (
          <p className="mt-5 border-l-2 border-brand pl-4 text-[15px] leading-relaxed text-muted">
            {post.excerpt}
          </p>
        )}
      </header>

      {post.cover_image && (
        <div className="relative mx-auto mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl bg-brand/8">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mx-auto mt-8 max-w-3xl text-[15px] sm:text-base">
        <Markdown content={post.content} />
      </div>

      {/* CTA */}
      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/12 to-accent/10 p-6 text-center">
        <p className="font-display text-xl font-extrabold">এই লেখা ভালো লাগলো? 🎂</p>
        <p className="mt-1.5 text-sm text-muted">
          নিজের পছন্দের কেক বেছে নিন — ৩ ধাপেই অর্ডার সম্পন্ন।
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/cakes" className="btn btn-primary btn-sm">কেক দেখুন</Link>
          <Link href="/custom-order" className="btn btn-ghost btn-sm">Custom Cake</Link>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-xl font-extrabold">আরও পড়ুন</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card group overflow-hidden">
                <div className="relative aspect-[16/9] bg-brand/8">
                  {p.cover_image && (
                    <Image
                      src={p.cover_image}
                      alt={p.title}
                      fill
                      sizes="33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-bold transition-colors group-hover:text-brand-strong">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {p.published_at ? formatDate(p.published_at) : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex justify-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Share2 className="h-3.5 w-3.5" /> বন্ধুদের সাথে শেয়ার করুন
        </span>
      </div>
    </article>
  );
}
