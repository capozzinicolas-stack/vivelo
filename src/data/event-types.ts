/**
 * Event type definitions for SEO landing pages.
 * Each event type generates a page at /eventos/[slug].
 * All categories are relevant to all event types — the pages show all services
 * with event-specific SEO content and messaging.
 */

export interface EventType {
  slug: string;
  label: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  content: string;
  /** Categories to highlight first in the grid (all services still shown) */
  highlightCategories: string[];
}

export const EVENT_TYPES: EventType[] = [
  {
    slug: 'bodas',
    label: 'Bodas',
    metaTitle: 'Servicios para Bodas en Mexico',
    metaDescription: 'Encuentra los mejores proveedores para tu boda en Mexico. Catering, decoracion floral, fotografia, musica en vivo, mobiliario y mas. Cotiza gratis en Vivelo.',
    heading: 'Servicios para Bodas en Mexico',
    intro: 'Haz de tu boda un evento inolvidable con los mejores proveedores verificados de Mexico. Desde el catering hasta la decoracion floral, encuentra todo lo que necesitas en un solo lugar.',
    content: 'Organizar una boda requiere coordinar multiples servicios: el banquete perfecto, la decoracion que refleje tu estilo, el fotografo que capture cada momento, la musica que ponga a bailar a todos y el mobiliario que complete la ambientacion. En Vivelo conectamos parejas con proveedores profesionales en las 9 zonas donde operamos. Compara precios, revisa resenas y cotiza directamente — todo desde una sola plataforma.',
    highlightCategories: ['FOOD_DRINKS', 'DECORATION', 'PHOTO_VIDEO', 'AUDIO'],
  },
  {
    slug: 'xv-anos',
    label: 'XV Anos',
    metaTitle: 'Servicios para XV Anos en Mexico',
    metaDescription: 'Todo para la fiesta de XV anos perfecta. DJ, catering, decoracion, fotografia, chambelanes y mas. Proveedores verificados en Mexico.',
    heading: 'Servicios para Fiestas de XV Anos',
    intro: 'Celebra los XV anos con una fiesta espectacular. Encuentra DJ, catering, decoracion tematica, fotografia profesional y todo lo que necesitas para una quinceañera inolvidable.',
    content: 'La fiesta de XV anos es una de las celebraciones mas importantes en la tradicion mexicana. Desde el vals hasta la ultima hora de fiesta, cada detalle cuenta. En Vivelo encuentras proveedores especializados en quinceañeras: DJs que conocen las tradiciones, decoradores que crean ambientes magicos, fotografos que capturan cada momento y servicios de catering para todos los gustos. Cotiza y compara opciones de forma facil y rapida.',
    highlightCategories: ['AUDIO', 'DECORATION', 'PHOTO_VIDEO', 'FOOD_DRINKS'],
  },
  {
    slug: 'bautizos',
    label: 'Bautizos',
    metaTitle: 'Servicios para Bautizos en Mexico',
    metaDescription: 'Organiza el bautizo perfecto. Catering, decoracion, fotografia y musica para celebrar este momento especial. Proveedores en Mexico.',
    heading: 'Servicios para Bautizos',
    intro: 'Celebra el bautizo con una recepcion especial. Encuentra catering, decoracion elegante, fotografia y musica para este momento tan significativo.',
    content: 'El bautizo es un momento de celebracion familiar que merece una organizacion cuidadosa. Ya sea una recepcion intima o una gran fiesta, en Vivelo encontraras proveedores que se adaptan a tu presupuesto y estilo. Desde brunch y comida para la recepcion, hasta decoracion tematica en tonos pastel, fotografia profesional y musica de fondo — coordina todos los servicios desde una sola plataforma.',
    highlightCategories: ['FOOD_DRINKS', 'DECORATION', 'PHOTO_VIDEO'],
  },
  {
    slug: 'primera-comunion',
    label: 'Primera Comunion',
    metaTitle: 'Servicios para Primera Comunion en Mexico',
    metaDescription: 'Servicios para fiestas de primera comunion. Catering, decoracion, fotografia y entretenimiento. Proveedores verificados en Mexico.',
    heading: 'Servicios para Primera Comunion',
    intro: 'Organiza la celebracion de primera comunion perfecta. Encuentra proveedores de catering, decoracion, fotografia y entretenimiento para este dia especial.',
    content: 'La primera comunion es un hito importante que las familias mexicanas celebran con alegria. En Vivelo te ayudamos a encontrar los mejores servicios para la recepcion: desde banquetes y mesas de dulces hasta decoracion tematica, fotografia que capture la emocion del dia y entretenimiento para los invitados. Compara precios y elige proveedores verificados cerca de ti.',
    highlightCategories: ['FOOD_DRINKS', 'DECORATION', 'PHOTO_VIDEO'],
  },
  {
    slug: 'cumpleanos',
    label: 'Cumpleanos',
    metaTitle: 'Servicios para Fiestas de Cumpleanos en Mexico',
    metaDescription: 'Todo para tu fiesta de cumpleanos. DJ, catering, decoracion, fotografia y mas. Encuentra proveedores en Mexico y cotiza gratis.',
    heading: 'Servicios para Fiestas de Cumpleanos',
    intro: 'Haz de tu cumpleanos una celebracion unica. Desde fiestas intimas hasta grandes eventos, encuentra DJ, catering, decoracion y todo lo que necesitas.',
    content: 'Cada cumpleanos es una oportunidad para celebrar en grande. Ya sea una cena elegante para adultos o una fiesta tematica, en Vivelo encontraras los proveedores perfectos. Explora opciones de catering para todos los presupuestos, DJs que pongan a bailar a todos, decoracion personalizada y fotografia que capture los mejores momentos. Todo en un solo lugar, con precios transparentes.',
    highlightCategories: ['AUDIO', 'FOOD_DRINKS', 'DECORATION', 'PHOTO_VIDEO'],
  },
  {
    slug: 'fiestas-infantiles',
    label: 'Fiestas Infantiles',
    metaTitle: 'Servicios para Fiestas Infantiles en Mexico',
    metaDescription: 'Organiza la mejor fiesta infantil. Animadores, shows, decoracion con globos, mesas de dulces, inflables y mas. Proveedores en Mexico.',
    heading: 'Servicios para Fiestas Infantiles',
    intro: 'Crea una fiesta infantil magica con animadores, decoracion de globos, mesas de dulces, shows y todo lo que los ninos aman.',
    content: 'Las fiestas infantiles requieren creatividad y proveedores que sepan como hacer felices a los pequenos. En Vivelo encuentras animadores profesionales, shows interactivos, decoracion con globos y backdrops, mesas de dulces tematicas, food trucks divertidos y mucho mas. Filtra por zona para encontrar proveedores cerca de ti y compara opciones facilmente.',
    highlightCategories: ['AUDIO', 'DECORATION', 'FOOD_DRINKS', 'FURNITURE'],
  },
  {
    slug: 'baby-shower',
    label: 'Baby Shower',
    metaTitle: 'Servicios para Baby Shower en Mexico',
    metaDescription: 'Organiza el baby shower perfecto. Decoracion, catering, fotografia y mas. Proveedores verificados para celebrar la llegada del bebe.',
    heading: 'Servicios para Baby Shower',
    intro: 'Celebra la llegada del bebe con un baby shower inolvidable. Encuentra decoracion en tonos pastel, catering especial, fotografia y todo lo necesario.',
    content: 'El baby shower es un momento especial para celebrar con familia y amigos la llegada de un nuevo integrante. En Vivelo te ayudamos a encontrar decoracion tematica con globos y backdrops, catering con opciones de brunch y postres, fotografia que capture la emocion y mobiliario elegante para ambientar el espacio. Todo con proveedores verificados y precios claros.',
    highlightCategories: ['DECORATION', 'FOOD_DRINKS', 'PHOTO_VIDEO'],
  },
  {
    slug: 'graduaciones',
    label: 'Graduaciones',
    metaTitle: 'Servicios para Fiestas de Graduacion en Mexico',
    metaDescription: 'Celebra tu graduacion con los mejores servicios. DJ, catering, fotografia, mobiliario y mas para tu fiesta de graduacion en Mexico.',
    heading: 'Servicios para Fiestas de Graduacion',
    intro: 'Celebra tu graduacion como se merece. Encuentra DJ, catering, fotografia y mobiliario para una fiesta de graduacion epica.',
    content: 'La graduacion marca el cierre de una etapa importante y merece una gran celebracion. Ya sea una fiesta de generacion o una celebracion familiar, en Vivelo encontraras todo lo necesario: DJs y sonido profesional para la pista de baile, catering y barras de bebidas, fotografia y video para el recuerdo, carpas y mobiliario si es evento al aire libre. Explora opciones y arma tu evento ideal.',
    highlightCategories: ['AUDIO', 'FOOD_DRINKS', 'FURNITURE', 'PHOTO_VIDEO'],
  },
  {
    slug: 'corporativos',
    label: 'Eventos Corporativos',
    metaTitle: 'Servicios para Eventos Corporativos en Mexico',
    metaDescription: 'Servicios profesionales para eventos corporativos. Catering, audio, mobiliario, fotografia y staff para tu empresa en Mexico.',
    heading: 'Servicios para Eventos Corporativos',
    intro: 'Organiza eventos corporativos impecables. Encuentra catering ejecutivo, audio profesional, mobiliario, fotografia y staff capacitado para tu empresa.',
    content: 'Los eventos corporativos requieren precision y profesionalismo. En Vivelo conectamos empresas con proveedores especializados en el segmento corporativo: coffee breaks y catering por tiempos para conferencias, sistemas de audio e iluminacion profesional, mobiliario ejecutivo, fotografia corporativa y staff de apoyo como hostess, coordinadores y seguridad. Solicita cotizaciones de multiples proveedores y elige la mejor opcion para tu presupuesto.',
    highlightCategories: ['FOOD_DRINKS', 'AUDIO', 'FURNITURE', 'STAFF'],
  },
  {
    slug: 'despedidas',
    label: 'Despedidas de Soltero/a',
    metaTitle: 'Servicios para Despedida de Soltero y Soltera en Mexico',
    metaDescription: 'Organiza la mejor despedida de soltero o soltera. DJ, barras de bebidas, karaoke, decoracion y mas. Proveedores en Mexico.',
    heading: 'Servicios para Despedidas de Soltero y Soltera',
    intro: 'Organiza una despedida de soltero o soltera inolvidable. DJ, barras de cocteleria, karaoke, decoracion divertida y todo para una noche epica.',
    content: 'La despedida de soltero o soltera es la ultima gran fiesta antes de la boda. Hazla memorable con los mejores proveedores: DJs que pongan la fiesta, barras de cocteleria de autor, karaoke para cantar toda la noche, decoracion divertida y tematica, fotografia que capture los mejores momentos y hasta food trucks para los antojos nocturnos. En Vivelo encuentras todo para una celebracion unica.',
    highlightCategories: ['AUDIO', 'FOOD_DRINKS', 'DECORATION'],
  },
  {
    slug: 'aniversarios',
    label: 'Aniversarios',
    metaTitle: 'Servicios para Fiestas de Aniversario en Mexico',
    metaDescription: 'Celebra tu aniversario con los mejores servicios. Cena romantica, musica en vivo, decoracion floral, fotografia y mas en Mexico.',
    heading: 'Servicios para Celebraciones de Aniversario',
    intro: 'Celebra tu aniversario con una fiesta o cena especial. Musica en vivo, decoracion floral, catering gourmet y fotografia profesional.',
    content: 'Ya sea un aniversario de bodas o cualquier celebracion de pareja, en Vivelo encuentras los servicios perfectos para una velada romantica o una gran fiesta. Desde musica en vivo con saxofon o violin, decoracion floral elegante, catering gourmet y fotografia profesional hasta montajes completos para celebraciones de bodas de plata y de oro. Compara opciones y crea el evento perfecto.',
    highlightCategories: ['AUDIO', 'DECORATION', 'FOOD_DRINKS', 'PHOTO_VIDEO'],
  },
  {
    slug: 'posadas',
    label: 'Posadas y Eventos Navidenos',
    metaTitle: 'Servicios para Posadas y Fiestas Navidenas en Mexico',
    metaDescription: 'Todo para tu posada o fiesta navidena. Taquizas, DJ, decoracion navidena, fotografia y mas. Proveedores verificados en Mexico.',
    heading: 'Servicios para Posadas y Fiestas Navidenas',
    intro: 'Organiza la posada perfecta con taquizas, musica, decoracion navidena, fotografia y todo lo que necesitas para celebrar la temporada.',
    content: 'Las posadas y fiestas navidenas son una tradicion que une a familias, amigos y empresas. En Vivelo encuentras proveedores perfectos para la temporada: taquizas y estaciones de comida mexicana, barras de ponche y bebidas navidenas, DJs y musica en vivo, decoracion tematica navidena, fotografia para el recuerdo y mobiliario para eventos al aire libre. Cotiza con anticipacion para asegurar disponibilidad en la temporada mas solicitada del ano.',
    highlightCategories: ['FOOD_DRINKS', 'AUDIO', 'DECORATION', 'FURNITURE'],
  },
  {
    slug: 'cenas-reuniones',
    label: 'Cenas y Reuniones',
    metaTitle: 'Servicios para Cenas y Reuniones Privadas en Mexico',
    metaDescription: 'Servicios para cenas y reuniones privadas. Chef en sitio, barras de bebidas, decoracion, musica ambiental y mas en Mexico.',
    heading: 'Servicios para Cenas y Reuniones Privadas',
    intro: 'Eleva tus cenas y reuniones privadas con chef en sitio, barras de bebidas de autor, decoracion elegante y musica ambiental.',
    content: 'No todas las celebraciones necesitan ser grandes. Las cenas privadas y reuniones intimas tambien merecen servicios de primera. En Vivelo encontraras chefs en sitio que preparan menus personalizados, bartenders que crean cocteles de autor, decoracion minimalista y elegante, musica ambiental con saxofon o guitarra y todo lo necesario para una velada perfecta. Ideal para cumpleanos intimos, cenas de negocios o reuniones familiares.',
    highlightCategories: ['FOOD_DRINKS', 'STAFF', 'AUDIO', 'DECORATION'],
  },
  {
    slug: 'inauguraciones',
    label: 'Inauguraciones y Lanzamientos',
    metaTitle: 'Servicios para Inauguraciones y Lanzamientos en Mexico',
    metaDescription: 'Servicios para inauguraciones y lanzamientos de marca. Catering, audio, decoracion, fotografia y staff profesional en Mexico.',
    heading: 'Servicios para Inauguraciones y Lanzamientos',
    intro: 'Haz de tu inauguracion o lanzamiento un evento memorable. Catering, audio profesional, decoracion de marca, fotografia y staff capacitado.',
    content: 'Las inauguraciones y lanzamientos de marca requieren una ejecucion impecable para causar la mejor impresion. En Vivelo conectamos negocios con proveedores profesionales: catering y cocteleria para la recepcion, audio e iluminacion para presentaciones, decoracion corporativa con branding, fotografia y video para redes sociales, y staff de apoyo como hostess, coordinadores y seguridad. Haz que tu evento de apertura sea tan memorable como tu marca.',
    highlightCategories: ['FOOD_DRINKS', 'AUDIO', 'STAFF', 'PHOTO_VIDEO'],
  },
];

/** Map of slug → EventType for quick lookup */
export const EVENT_TYPE_MAP = Object.fromEntries(
  EVENT_TYPES.map(et => [et.slug, et])
) as Record<string, EventType>;
