'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Video, Mic, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PromoBanner } from '@/components/marketing/promo-banner';
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Collect all unique tags from posts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    posts.forEach(p => (p.tags ?? []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [posts]);

  // Filter posts by selected tag and search query
  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedTag) {
      result = result.filter(p => (p.tags ?? []).includes(selectedTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, selectedTag, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/"><ArrowLeft className="h-4 w-4 mr-2" />Inicio</Link>
        </Button>
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-muted-foreground mt-2">Noticias, guias y contenido sobre eventos en México</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar articulos..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedTag === null ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedTag(null)}
          >
            Todos
          </Badge>
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">{selectedTag ? `No hay publicaciones con la etiqueta "${selectedTag}".` : 'Aun no hay publicaciones.'}</p>
          {selectedTag && (
            <Button variant="ghost" className="mt-2" onClick={() => setSelectedTag(null)}>Ver todos</Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => {
              const MediaIcon = mediaTypeIcons[post.media_type] || FileText;
              return (
                <React.Fragment key={post.id}>
                  {index === 3 && (
                    <div className="col-span-full">
                      <PromoBanner bannerKey="blog_inline_banner" variant="inline" />
                    </div>
                  )}
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                      {post.cover_image ? (
                        <div className="h-40 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-violet-100 to-indigo-100 h-40 flex items-center justify-center">
                          <MediaIcon className="h-12 w-12 text-violet-400" />
                        </div>
                      )}
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{mediaTypeLabels[post.media_type]}</Badge>
                          {(post.tags ?? []).slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
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
                </React.Fragment>
              );
            })}
          </div>
          {filteredPosts.length <= 3 && (
            <div className="mt-6">
              <PromoBanner bannerKey="blog_inline_banner" variant="inline" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
