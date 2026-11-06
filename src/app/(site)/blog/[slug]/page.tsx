import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Share2 } from "lucide-react";
import { getCachedPostBySlug, getCachedSettings, listCachedPosts } from "@/lib/store/cache";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { blogLd, breadcrumbLd, ldJson } from "@/lib/seo";
import { Markdown, ReadingTime } from "@/components/markdown";
import { BlogShare } from "@/components/blog-share";

interface Ctx {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

/** Prerender published posts; admin edits revalidate the whole site anyway. */
export async function generateStaticParams() {
  const posts = await listCachedPosts(true);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPostBySlug(slug);
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

  const [post, settings] = await Promise.all([
    getCachedPostBySlug(slug),
    getCachedSettings(),
  ]);

  if (!post || !post.is_published) notFound();

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

      <div className="mt-10 flex justify-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Share2 className="h-3.5 w-3.5" /> বন্ধুদের সাথে শেয়ার করুন
        </span>
      </div>
    </article>
  );
}