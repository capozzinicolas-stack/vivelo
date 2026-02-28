'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Video, Mic, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/types/database';
import { getPublishedBlogPosts } from '@/lib/supabase/queries';

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

export function BlogListClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublishedBlogPosts();
        setPosts(data);
      } catch (err) {
        console.error('Error loading blog posts:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Inicio</Link>
        </Button>
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-muted-foreground mt-2">Noticias, guias y contenido sobre eventos en México</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aun no hay publicaciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => {
            const MediaIcon = mediaTypeIcons[post.media_type] || FileText;
            return (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                  <div className="bg-gradient-to-br from-violet-100 to-indigo-100 h-40 flex items-center justify-center">
                    <MediaIcon className="h-12 w-12 text-violet-400" />
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{mediaTypeLabels[post.media_type]}</Badge>
                      {post.publish_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.publish_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold line-clamp-2">{post.title}</h2>
                    {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
