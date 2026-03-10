/**
 * Sitemap Generator for DevsFlow
 * Generates XML sitemap for SEO purposes
 */

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const BASE_URL = 'https://devsflow.netlify.app';

export const SITEMAP_ENTRIES: SitemapEntry[] = [
  {
    url: '/',
    changefreq: 'weekly',
    priority: 1.0,
  },
  {
    url: '/auth',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    url: '/dashboard',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: '/editor',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: '/ai/snippets',
    changefreq: 'daily',
    priority: 0.85,
  },
  {
    url: '/ai/analysis',
    changefreq: 'daily',
    priority: 0.85,
  },
  {
    url: '/ai/converter',
    changefreq: 'daily',
    priority: 0.85,
  },
  {
    url: '/courses',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: '/roadmap',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: '/goals',
    changefreq: 'daily',
    priority: 0.85,
  },
  {
    url: '/shortener',
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    url: '/debug',
    changefreq: 'daily',
    priority: 0.75,
  },
  {
    url: '/history',
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    url: '/settings',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    url: '/profile',
    changefreq: 'weekly',
    priority: 0.7,
  },
];

export function generateSitemap(): string {
  const entries = SITEMAP_ENTRIES.map(entry => {
    const lastmod = entry.lastmod || new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>${BASE_URL}${entry.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq || 'weekly'}</changefreq>
    <priority>${entry.priority || 0.5}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /auth
Disallow: /settings
Disallow: /profile

Sitemap: ${BASE_URL}/sitemap.xml`;
}
