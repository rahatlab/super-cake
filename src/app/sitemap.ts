import type { MetadataRoute } from "next";
import { getStore } from "@/lib/store";
import { SITE } from "@/lib/constants";

const NOW = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = getStore();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: NOW, changeFrequency: "daily", priority: 1 },
    { url: `${SITE.url}/cakes`, lastModified: NOW, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/custom-order`, lastModified: NOW, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/track`, lastModified: NOW, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE.url}/blog`, lastModified: NOW, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE.url}/privacy`, lastModified: NOW, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/terms`, lastModified: NOW, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE.url}/data-deletion`, lastModified: NOW, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [cakes, posts] = await Promise.all([
      store.listCakes(),
      store.listPosts({ publishedOnly: true }),
    ]);

    const cakeRoutes: MetadataRoute.Sitemap = cakes.map((c) => ({
      url: `${SITE.url}/cakes/${c.slug}`,
      lastModified: new Date(c.created_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${SITE.url}/blog/${p.slug}`,
      lastModified: new Date(p.published_at ?? p.created_at),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...cakeRoutes, ...postRoutes];
  } catch {
    return staticRoutes;
  }
}
