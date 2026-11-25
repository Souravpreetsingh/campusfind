import type { MetadataRoute } from 'next';
import { pageCatalog } from '@/content/pages';

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...pageCatalog.map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: page.group === 'public' ? 0.8 : 0.5,
    })),
  ];
}
