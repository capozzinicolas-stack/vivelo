import type { Service } from '@/types/database';

interface ServiceFaqProps {
  service: Service;
  providerName: string;
}

function generateFaqItems(service: Service, providerName: string) {
  const items: { question: string; answer: string }[] = [];

  items.push({
    question: `¿Cuanto cuesta ${service.title}?`,
    answer: service.price_unit === 'por persona'
      ? `El precio base es de $${service.base_price.toLocaleString()} MXN por persona. El total depende del numero de invitados (${service.min_guests}-${service.max_guests}).`
      : service.price_unit === 'por hora'
        ? `El precio base es de $${service.base_price.toLocaleString()} MXN por hora. Minimo ${service.min_hours || 1} horas.`
        : `El precio es de $${service.base_price.toLocaleString()} MXN por evento${service.base_event_hours ? ` (incluye ${service.base_event_hours} horas)` : ''}.`,
  });

  items.push({
    question: `¿Que incluye ${service.title}?`,
    answer: service.description.slice(0, 200) + (service.description.length > 200 ? '...' : ''),
  });

  if (service.zones.length > 0) {
    items.push({
      question: `¿En que zonas esta disponible ${service.title}?`,
      answer: `Este servicio cubre las siguientes zonas: ${service.zones.join(', ')}.`,
    });
  }

  items.push({
    question: `¿Quien ofrece ${service.title}?`,
    answer: `Este servicio es ofrecido por ${providerName}, proveedor verificado en Vivelo.`,
  });

  if (service.extras && service.extras.length > 0) {
    items.push({
      question: `¿Que extras puedo agregar a ${service.title}?`,
      answer: `Puedes agregar: ${service.extras.map(e => e.name).join(', ')}. Los extras se contratan por separado.`,
    });
  }

  return items;
}

export function ServiceFaq({ service, providerName }: ServiceFaqProps) {
  const faqItems = generateFaqItems(service, providerName);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h3 className="text-lg font-semibold">Preguntas frecuentes</h3>
      <div className="space-y-3">
        {faqItems.map((item, index) => (
          <details key={index} className="group border rounded-lg">
            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-sm hover:bg-muted/50 transition-colors">
              {item.question}
              <span className="text-muted-foreground group-open:rotate-180 transition-transform">&#9660;</span>
            </summary>
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
