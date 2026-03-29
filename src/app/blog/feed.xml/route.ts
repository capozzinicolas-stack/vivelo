import { getPublishedBlogPostsServer } from '@/lib/supabase/server-queries';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com';
  const posts = await getPublishedBlogPostsServer();

  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const items = posts.map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      ${post.publish_date ? `<pubDate>${new Date(post.publish_date).toUTCString()}</pubDate>` : ''}
      ${(post.tags ?? []).map(t => `<category>${escapeXml(t)}</category>`).join('\n      ')}
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog - Vivelo</title>
    <link>${siteUrl}/blog</link>
    <description>Noticias, guias y contenido sobre eventos en México</description>
    <language>es-mx</language>
    <atom:link href="${siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
