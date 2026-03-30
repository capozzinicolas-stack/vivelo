import type { Metadata } from 'next';
import { getPublishedBlogPostsServer } from '@/lib/supabase/server-queries';
import { BlogListClient } from './blog-list-client';
import type { BlogPost } from '@/types/database';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Noticias, guias y contenido sobre eventos en México. Consejos para organizar bodas, fiestas, eventos corporativos y mas.',
  openGraph: {
    title: 'Blog - Vivelo',
    description: 'Noticias, guias y contenido sobre eventos en México',
  },
  alternates: {
    types: {
      'application/rss+xml': '/blog/feed.xml',
    },
  },
};

export default async function BlogPage() {
  let posts: BlogPost[] = [];

  try {
    posts = await getPublishedBlogPostsServer();
  } catch (error) {
    console.error('[BlogPage] Error loading posts:', error);
  }

  return <BlogListClient initialPosts={posts} />;
}
