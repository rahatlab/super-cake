import type { Cake, Review, Settings } from "./types";
import { SITE } from "./constants";
import { formatBDT } from "./utils";

/** JSON-LD is injected as <script type="application/ld+json"> for rich results. */
export function organizationLd(settings: Settings) {
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: settings.store_name,
    description: SITE.description,
    url: SITE.url,
    telephone: settings.phone,
    email: settings.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    priceRange: "৳৳",
    sameAs: [settings.instagram, settings.facebook].filter(Boolean),
  };
}

export function productLd(cake: Cake, reviews: Review[], settings: Settings) {
  const approved = reviews.filter((r) => r.is_approved);
  const rating =
    approved.length > 0
      ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10) / 10
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cake.name,
    description: cake.description,
    image: cake.image_urls.map((u) => (u.startsWith("http") ? u : `${SITE.url}${u}`)),
    brand: { "@type": "Brand", name: settings.store_name },
    sku: cake.id,
    category: cake.category,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/cakes/${cake.slug}`,
      priceCurrency: "BDT",
      price: cake.base_price,
      availability: cake.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: approved.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function blogLd(post: { title: string; slug: string; excerpt: string; cover_image?: string | null; published_at?: string | null }, settings: Settings) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image ? [post.cover_image.startsWith("http") ? post.cover_image : `${SITE.url}${post.cover_image}`] : undefined,
    datePublished: post.published_at ?? undefined,
    author: { "@type": "Organization", name: settings.store_name },
    publisher: { "@type": "Organization", name: settings.store_name, logo: { "@type": "ImageObject", url: `${SITE.url}/logo.svg` } },
    mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
  };
}

export function breadcrumbLd(items: { name: string; item?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.item ? { item: `${SITE.url}${it.item}` } : {}),
    })),
  };
}

export function websiteLd(settings: Settings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.store_name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/cakes?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Serialize any LD object for the <script> tag. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export { formatBDT };
