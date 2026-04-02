import Link from 'next/link';

const FEATURED_EVENTS = [
  { slug: 'bodas', label: 'Bodas', emoji: '\u{1F492}' },
  { slug: 'xv-anos', label: 'XV A\u00f1os', emoji: '\u{1F451}' },
  { slug: 'cumpleanos', label: 'Cumplea\u00f1os', emoji: '\u{1F382}' },
  { slug: 'corporativos', label: 'Corporativos', emoji: '\u{1F3E2}' },
  { slug: 'baby-shower', label: 'Baby Shower', emoji: '\u{1F476}' },
  { slug: 'graduaciones', label: 'Graduaciones', emoji: '\u{1F393}' },
  { slug: 'bautizos', label: 'Bautizos', emoji: '\u26EA' },
  { slug: 'fiestas-infantiles', label: 'Fiestas', emoji: '\u{1F389}' },
];

export function EventTypesSection() {
  return (
    <section className="py-8 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-3xl font-bold mb-2">Que estas celebrando?</h2>
        <p className="text-muted-foreground mb-6 md:mb-8">Encuentra todo lo que necesitas para tu evento</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURED_EVENTS.map(event => (
            <Link
              key={event.slug}
              href={`/eventos/${event.slug}`}
              className="flex flex-col items-center p-5 rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all text-center group"
            >
              <span className="text-3xl mb-2">{event.emoji}</span>
              <span className="font-semibold text-sm group-hover:text-primary transition-colors">{event.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
