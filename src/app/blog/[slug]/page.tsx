'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Video, Mic, Calendar } from 'lucide-react';
import type { BlogPost } from '@/types/database';
import { getBlogPostBySlug } from '@/lib/supabase/queries';

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

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getBlogPostBySlug(slug);
        setPost(data);
      } catch (err) {
        console.error('Error loading blog post:', err);
      }
      setLoading(false);
    }
    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Skeleton className="h-6 w-24 mb-8" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Post no encontrado</h1>
        <p className="text-muted-foreground mb-6">El articulo que buscas no existe o no esta publicado.</p>
        <Button asChild><Link href="/blog">Ver todos los posts</Link></Button>
      </div>
    );
  }

  const MediaIcon = mediaTypeIcons[post.media_type] || FileText;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
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
