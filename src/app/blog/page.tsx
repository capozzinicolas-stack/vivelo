import type { Metadata } from 'next';
import { BlogListClient } from './blog-list-client';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Noticias, guias y contenido sobre eventos en México. Consejos para organizar bodas, fiestas, eventos corporativos y mas.',
  openGraph: {
    title: 'Blog - Vivelo',
    description: 'Noticias, guias y contenido sobre eventos en México',
  },
};

export default function BlogPage() {
  return <BlogListClient />;
}
