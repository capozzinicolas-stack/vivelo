import type { BlogPost } from '@/types/database';

export const mockBlogPosts: BlogPost[] = [
  {
    id: '70000000-0000-0000-0000-000000000001',
    title: '10 Tendencias de Eventos para 2026',
    slug: '10-tendencias-eventos-2026',
    excerpt: 'Descubre las tendencias mas innovadoras que definiran los eventos este ano, desde decoracion sostenible hasta experiencias inmersivas.',
    content: `# 10 Tendencias de Eventos para 2026

Los eventos en México están evolucionando rápidamente. Aquí te presentamos las tendencias que marcarán la diferencia este año.

## 1. Decoración Sostenible
Cada vez más organizadores optan por materiales reciclados y decoración eco-friendly.

## 2. Experiencias Inmersivas
La tecnología permite crear ambientes únicos con proyecciones y realidad aumentada.

## 3. Gastronomía Fusion
Los food trucks gourmet y las barras de coctelería artesanal siguen en auge.

## 4. Micro-Bodas
Eventos íntimos con atención al detalle siguen siendo tendencia.

## 5. Entretenimiento Interactivo
Photobooths 360°, karaoke y actividades para invitados.

## 6. Personalización Total
Desde invitaciones hasta menús, todo se personaliza al máximo.

## 7. Eventos al Aire Libre
Jardines, terrazas y espacios abiertos son los preferidos.

## 8. Iluminación Artística
La iluminación LED y los efectos de luz transforman cualquier espacio.

## 9. Coordinación Digital
Apps y herramientas digitales para la planificación de eventos.

## 10. Proveedores Verificados
Plataformas como Vivelo garantizan calidad y confianza.`,
    cover_image: '/placeholder-blog-1.jpg',
    media_type: 'text',
    media_url: null,
    status: 'published',
    publish_date: '2026-01-15T10:00:00Z',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000002',
    title: 'Guia Completa: Como Elegir tu Catering',
    slug: 'guia-elegir-catering',
    excerpt: 'Todo lo que necesitas saber para elegir el servicio de catering perfecto para tu evento. Desde el presupuesto hasta el menu ideal.',
    content: `# Guía Completa: Cómo Elegir tu Catering

Elegir el catering adecuado puede hacer o deshacer tu evento. Sigue esta guía para tomar la mejor decisión.

## Define tu Presupuesto
Antes de buscar opciones, establece un presupuesto claro por persona.

## Considera el Tipo de Evento
No es lo mismo un catering para boda que para un evento corporativo.

## Prueba Antes de Contratar
Siempre solicita una degustación antes de confirmar.

## Revisa las Reseñas
En Vivelo puedes ver calificaciones reales de otros clientes.

## Confirma la Logística
Asegúrate de que el proveedor tenga experiencia en tu zona y tipo de venue.`,
    cover_image: '/placeholder-blog-2.jpg',
    media_type: 'text',
    media_url: null,
    status: 'published',
    publish_date: '2026-02-01T10:00:00Z',
    created_at: '2026-01-25T00:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: '70000000-0000-0000-0000-000000000003',
    title: 'Video: Detras de Escenas de un Evento Vivelo',
    slug: 'detras-de-escenas-evento-vivelo',
    excerpt: 'Acompananos en este video exclusivo donde mostramos como se coordina un evento de principio a fin con proveedores Vivelo.',
    content: 'Mira este video exclusivo donde te mostramos el proceso completo de coordinación de un evento con proveedores de Vivelo.',
    cover_image: '/placeholder-blog-3.jpg',
    media_type: 'video',
    media_url: 'https://www.youtube.com/watch?v=example',
    status: 'draft',
    publish_date: null,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];
