import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ArrowLeft, FileText, Video, Mic, Calendar, Tag } from 'lucide-react';
import { getBlogPostBySlugServer, getBlogPostLinksServer } from '@/lib/supabase/server-queries';
import { notFound } from 'next/navigation';
import { ServiceCard } from '@/components/services/service-card';

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || `Lee ${post.title} en el blog de Vivelo`;
  const ogImage = post.og_image || post.cover_image;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      ...(post.publish_date ? { publishedTime: post.publish_date } : {}),
    },
    ...(post.focus_keyword ? { keywords: [post.focus_keyword, ...(post.tags ?? [])] } : {}),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPostBySlugServer(params.slug);

  if (!post) {
    notFound();
  }

  const links = await getBlogPostLinksServer(post.id);
  const linkedServices = links.filter(l => l.service && l.service.status === 'active').map(l => ({ ...l.service!, provider: l.provider || l.service!.provider }));
  const linkedProviders = links.filter(l => l.provider && !l.service_id).map(l => l.provider!);

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
    ...(post.focus_keyword ? { keywords: post.focus_keyword } : {}),
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
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MediaIcon className="h-3 w-3" />{mediaTypeLabels[post.media_type]}
          </Badge>
          {(post.tags ?? []).map(tag => (
            <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
              <Badge variant="outline" className="flex items-center gap-1 cursor-pointer hover:bg-muted">
                <Tag className="h-3 w-3" />{tag}
              </Badge>
            </Link>
          ))}
          {post.publish_date && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(post.publish_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

        {post.cover_image && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_image} alt={post.title} className="w-full h-auto max-h-96 object-cover" />
          </div>
        )}

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
            // Images: ![alt](url)
            const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imgMatch) {
              return (
                <figure key={i} className="my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full rounded-lg" />
                  {imgMatch[1] && <figcaption className="text-center text-sm text-muted-foreground mt-2">{imgMatch[1]}</figcaption>}
                </figure>
              );
            }
            if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(4)}</h3>;
            if (line.startsWith('- ')) return <li key={i} className="ml-6 mb-1 text-muted-foreground leading-relaxed">{line.slice(2)}</li>;
            if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-violet-300 pl-4 italic text-muted-foreground my-4">{line.slice(2)}</blockquote>;
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="mb-3 text-muted-foreground leading-relaxed">{renderInlineMarkdown(line)}</p>;
          })}
        </div>
      </article>

      {/* Linked services */}
      {linkedServices.length > 0 && (
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Servicios mencionados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedServices.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        </div>
      )}

      {/* Linked providers */}
      {linkedProviders.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-xl font-semibold mb-4">Proveedores mencionados</h2>
          <div className="flex flex-wrap gap-3">
            {linkedProviders.map(p => (
              <Link key={p.id} href={`/proveedores/${p.slug}`}>
                <Badge variant="outline" className="py-2 px-3 text-sm cursor-pointer hover:bg-muted">
                  {p.company_name || p.full_name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t">
        <Button variant="outline" asChild>
          <Link href="/blog"><ArrowLeft className="h-4 w-4 mr-2" />Mas articulos</Link>
        </Button>
      </div>
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, [link](url) */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*([\s\S]*)/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }
    // Italic: *text*
    const italicMatch = remaining.match(/^([\s\S]*?)\*(.+?)\*([\s\S]*)/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }
    // Link: [text](url)
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)/);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(<a key={key++} href={linkMatch[3]} className="text-violet-600 hover:underline" target="_blank" rel="noopener noreferrer">{linkMatch[2]}</a>);
      remaining = linkMatch[4];
      continue;
    }
    // No more matches
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
