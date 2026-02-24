'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mic, ArrowRight } from 'lucide-react';
import { HorizontalCarousel, FilterPills } from '@/components/ui/horizontal-carousel';
import type { BlogPost } from '@/types/database';

const topicPills = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Organizacion de Eventos', value: 'organizacion' },
  { label: 'Decoracion', value: 'decoracion' },
  { label: 'Estilos de Eventos', value: 'estilos' },
  { label: 'Tips y Consejos', value: 'tips' },
];

export function BlogSection({ posts, loading }: { posts: BlogPost[]; loading: boolean }) {
  const [selectedTopic, setSelectedTopic] = useState('ALL');

  if (loading) {
    return (
      <section className="py-16 bg-off-white">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-10" />
          <div className="flex gap-4">
            <Skeleton className="h-[400px] w-[300px] flex-shrink-0" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[400px] w-[280px] flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <section className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold">Todo sobre el mundo de eventos</h2>
          <Link href="/blog" className="flex items-center gap-1 text-deep-purple font-medium hover:underline">
            Ver todos <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Featured post card */}
          <div className="lg:w-[300px] flex-shrink-0">
            <Link href={`/blog/${featuredPost.slug}`}>
              <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex flex-col justify-end p-8 hover:shadow-lg transition-shadow cursor-pointer">
                {featuredPost.cover_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featuredPost.cover_image} alt={featuredPost.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-white leading-tight mb-4 line-clamp-4">
                    {featuredPost.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="bg-deep-purple text-white hover:bg-deep-purple/90">
                      Todos episodios
                    </Button>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Mic className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Right: pills + carousel */}
          <div className="flex-1 min-w-0">
            <FilterPills
              options={topicPills}
              selected={selectedTopic}
              onSelect={setSelectedTopic}
              className="mb-6"
            />

            <HorizontalCarousel>
              {otherPosts.map(post => (
                <div key={post.id} className="min-w-[280px] max-w-[300px] snap-start flex-shrink-0">
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full overflow-hidden">
                      <div className="relative h-52">
                        {post.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                            <Mic className="h-10 w-10 text-violet-400" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-bold line-clamp-2">{post.title}</h3>
                        {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </HorizontalCarousel>
          </div>
        </div>
      </div>
    </section>
  );
}
