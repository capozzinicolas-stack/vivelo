import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ArrowLeft, FileText, Video, Mic, Calendar } from 'lucide-react';
import { getBlogPostBySlugServer } from '@/lib/supabase/server-queries';
import { notFound } from 'next/navigation';

const mediaTypeIcons: Record<string, React.ElementType> = {
  text: FileText,
  video: Video,
  audio: Mic,
};

const mediaTypeLabels: Record<string, string> = {
  text: 'Articulo',
  video: 'Video',
  audio: 'Audio',
};

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPostBySlugServer(params.slug);
  if (!post) return { title: 'Post no encontrado' };

  return {
    title: post.title,
    description: post.excerpt || `Lee ${post.title} en el blog de Vivelo`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: 'article',
      ...(post.cover_image ? { images: [{ url: post.cover_image }] } : {}),
      ...(post.publish_date ? { publishedTime: post.publish_date } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPostBySlugServer(params.slug);

  if (!post) {
    notFound();
  }

  const MediaIcon = mediaTypeIcons[post.media_type] || FileText;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    ...(post.cover_image ? { image: post.cover_image } : {}),
    ...(post.publish_date ? { datePublished: post.publish_date } : {}),
    dateModified: post.updated_at,
    publisher: {
      '@type': 'Organization',
      name: 'Vivelo',
      url: siteUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${post.slug}`,
    },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs items={[
        { label: 'Inicio', href: '/' },
        { label: 'Blog', href: '/blog' },
        { label: post.title },
      ]} />

      <Button variant="ghost" asChild className="mb-6">
        <Link href="/blog"><ArrowLeft className="h-4 w-4 mr-2" />Volver al Blog</Link>
      </Button>

      <article>
        <div className="flex items-center gap-3 mb-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MediaIcon className="h-3 w-3" />{mediaTypeLabels[post.media_type]}
          </Badge>
          {post.publish_date && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(post.publish_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

        {post.excerpt && (
          <p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>
        )}

        {post.media_type === 'video' && post.media_url && (
          <div className="mb-8 rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="text-white hover:underline flex items-center gap-2">
              <Video className="h-8 w-8" />
              <span>Ver video</span>
            </a>
          </div>
        )}

        {post.media_type === 'audio' && post.media_url && (
          <div className="mb-8 rounded-lg bg-muted p-6 flex items-center gap-4">
            <Mic className="h-8 w-8 text-violet-500" />
            <a href={post.media_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-violet-600">
              Escuchar audio
            </a>
          </div>
        )}

        <div className="prose prose-neutral max-w-none">
          {post.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(4)}</h3>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="mb-3 text-muted-foreground leading-relaxed">{line}</p>;
          })}
        </div>
      </article>

      <div className="mt-12 pt-8 border-t">
        <Button variant="outline" asChild>
          <Link href="/blog"><ArrowLeft className="h-4 w-4 mr-2" />Mas articulos</Link>
        </Button>
      </div>
    </div>
  );
}
