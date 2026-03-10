/**
 * Metadata Manager for DevsFlow
 * Manages SEO metadata for all pages
 */

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  canonical?: string;
  robots?: string;
}

const BASE_URL = 'https://devsflow.netlify.app';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

export const METADATA: Record<string, PageMetadata> = {
  '/': {
    title: 'DevsFlow - Fix, Create, Improve and Vibe Code',
    description: 'DevsFlow is your all-in-one platform for code generation, analysis, debugging, and learning. Fix, create, improve and vibe code with AI-powered tools.',
    keywords: ['code generation', 'AI coding', 'debugging', 'code analysis', 'development tools', 'programming'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    canonical: BASE_URL,
    robots: 'index, follow',
  },
  '/auth': {
    title: 'Sign In - DevsFlow',
    description: 'Sign in to your DevsFlow account to access all coding tools and features.',
    keywords: ['login', 'authentication', 'sign in'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/auth`,
    robots: 'noindex, follow',
  },
  '/dashboard': {
    title: 'Dashboard - DevsFlow',
    description: 'Your personal dashboard with an overview of your projects, goals, and recent activities.',
    keywords: ['dashboard', 'overview', 'projects', 'progress'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/dashboard`,
    robots: 'noindex, follow',
  },
  '/editor': {
    title: 'Code Editor - DevsFlow',
    description: 'Advanced code editor with AI-powered suggestions and real-time collaboration features.',
    keywords: ['code editor', 'IDE', 'development', 'coding'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/editor`,
    robots: 'noindex, follow',
  },
  '/ai/snippets': {
    title: 'AI Code Snippets - DevsFlow',
    description: 'Generate and discover AI-powered code snippets for common programming tasks.',
    keywords: ['code snippets', 'AI generation', 'templates', 'code examples'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/ai/snippets`,
    robots: 'noindex, follow',
  },
  '/ai/analysis': {
    title: 'Code Analysis - DevsFlow',
    description: 'Analyze your code with AI to identify issues, improve quality, and optimize performance.',
    keywords: ['code analysis', 'debugging', 'code review', 'optimization'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/ai/analysis`,
    robots: 'noindex, follow',
  },
  '/ai/converter': {
    title: 'Code Converter - DevsFlow',
    description: 'Convert code between different programming languages with AI assistance.',
    keywords: ['code conversion', 'language translation', 'refactoring'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/ai/converter`,
    robots: 'noindex, follow',
  },
  '/courses': {
    title: 'Learning Courses - DevsFlow',
    description: 'Access curated coding courses and learning materials to improve your skills.',
    keywords: ['courses', 'learning', 'tutorials', 'education'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/courses`,
    robots: 'noindex, follow',
  },
  '/roadmap': {
    title: 'Learning Roadmap - DevsFlow',
    description: 'Follow personalized learning roadmaps to master programming and development skills.',
    keywords: ['roadmap', 'learning path', 'skill development', 'career growth'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/roadmap`,
    robots: 'noindex, follow',
  },
  '/goals': {
    title: 'Code Goals - DevsFlow',
    description: 'Set and track your coding goals to stay motivated and measure progress.',
    keywords: ['goals', 'tracking', 'progress', 'motivation'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/goals`,
    robots: 'noindex, follow',
  },
  '/shortener': {
    title: 'URL Shortener - DevsFlow',
    description: 'Shorten and share URLs easily with our integrated URL shortener tool.',
    keywords: ['URL shortener', 'link sharing', 'utilities'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/shortener`,
    robots: 'noindex, follow',
  },
  '/debug': {
    title: 'Debugger - DevsFlow',
    description: 'Debug your code with AI-powered insights and suggestions.',
    keywords: ['debugging', 'error detection', 'troubleshooting'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/debug`,
    robots: 'noindex, follow',
  },
  '/history': {
    title: 'Generation History - DevsFlow',
    description: 'View your code generation history and revisit previous projects.',
    keywords: ['history', 'projects', 'archive'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/history`,
    robots: 'noindex, follow',
  },
  '/settings': {
    title: 'Settings - DevsFlow',
    description: 'Manage your account settings and preferences.',
    keywords: ['settings', 'preferences', 'account'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/settings`,
    robots: 'noindex, follow',
  },
  '/profile': {
    title: 'Profile - DevsFlow',
    description: 'View and manage your profile information.',
    keywords: ['profile', 'account', 'user settings'],
    ogImage: DEFAULT_IMAGE,
    ogType: 'website',
    twitterCard: 'summary',
    canonical: `${BASE_URL}/profile`,
    robots: 'noindex, follow',
  },
};

export function setPageMetadata(path: string): void {
  const metadata = METADATA[path] || METADATA['/'];

  // Set title
  document.title = metadata.title;

  // Set or update meta tags
  setMetaTag('description', metadata.description);
  setMetaTag('keywords', metadata.keywords?.join(', ') || '');
  setMetaTag('robots', metadata.robots || 'index, follow');

  // Open Graph tags
  setMetaTag('og:title', metadata.title, 'property');
  setMetaTag('og:description', metadata.description, 'property');
  setMetaTag('og:image', metadata.ogImage || DEFAULT_IMAGE, 'property');
  setMetaTag('og:type', metadata.ogType || 'website', 'property');
  setMetaTag('og:url', `${BASE_URL}${path}`, 'property');

  // Twitter Card tags
  setMetaTag('twitter:card', metadata.twitterCard || 'summary_large_image');
  setMetaTag('twitter:title', metadata.title);
  setMetaTag('twitter:description', metadata.description);
  setMetaTag('twitter:image', metadata.ogImage || DEFAULT_IMAGE);

  // Canonical URL
  if (metadata.canonical) {
    setCanonicalURL(metadata.canonical);
  }
}

function setMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.content = content;
}

function setCanonicalURL(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
}

export function getMetadata(path: string): PageMetadata {
  return METADATA[path] || METADATA['/'];
}
