import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quien Somos | Vivelo — Marketplace de Eventos en Mexico',
  description:
    'Vivelo conecta a personas que quieren hacer su evento con proveedores verificados de catering, audio, decoracion, foto, staff y mobiliario en el centro de Mexico.',
  keywords: [
    'marketplace eventos Mexico',
    'servicios para eventos',
    'proveedores de eventos',
    'catering eventos Mexico',
    'organizar eventos',
    'Vivelo',
    'solovivelo',
    'reservar servicios eventos',
    'marketplace servicios fiestas',
  ],
  alternates: {
    canonical: 'https://solovivelo.com/quien-somos',
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://solovivelo.com/quien-somos',
    title: 'Quien Somos | Vivelo — Marketplace de Eventos en Mexico',
    description:
      'Conectamos a personas que quieren hacer su evento con proveedores verificados de catering, audio, decoracion, foto, staff y mobiliario en el centro de Mexico.',
    siteName: 'Vivelo',
    images: [
      {
        url: 'https://solovivelo.com/og-quien-somos.jpg',
        width: 1200,
        height: 630,
        alt: 'Quien Somos — Vivelo, Marketplace de Eventos en Mexico',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quien Somos | Vivelo — Marketplace de Eventos en Mexico',
    description:
      'Conectamos a personas que quieren hacer su evento con proveedores verificados en el centro de Mexico.',
    images: ['https://solovivelo.com/og-quien-somos.jpg'],
  },
};

export default function QuienSomosPage() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vivelo',
    alternateName: 'Solo Vivelo',
    url: 'https://solovivelo.com',
    logo: 'https://solovivelo.com/logo-vivelo.png',
    description:
      'Marketplace mexicano de servicios para eventos que conecta a personas que quieren celebrar con proveedores de catering, audio, decoracion, fotografia, staff y mobiliario.',
    foundingLocation: {
      '@type': 'Place',
      name: 'Ciudad de Mexico, Mexico',
    },
    areaServed: [
      { '@type': 'State', name: 'Ciudad de Mexico' },
      { '@type': 'State', name: 'Estado de Mexico' },
      { '@type': 'State', name: 'Puebla' },
      { '@type': 'State', name: 'Queretaro' },
      { '@type': 'State', name: 'Morelos' },
      { '@type': 'State', name: 'Hidalgo' },
      { '@type': 'State', name: 'Guanajuato' },
      { '@type': 'State', name: 'Tlaxcala' },
      { '@type': 'City', name: 'Toluca' },
    ],
    sameAs: [
      'https://www.instagram.com/solo.vivelo/',
      'https://www.tiktok.com/@solovivelo',
      'https://www.facebook.com/people/Vivelo/61577239706576/',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'es',
    },
  };

  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Quien Somos — Vivelo',
    description:
      'Conoce la mision, vision y modelo de Vivelo: el marketplace de servicios para eventos en Mexico.',
    url: 'https://solovivelo.com/quien-somos',
    mainEntity: {
      '@type': 'Organization',
      name: 'Vivelo',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://solovivelo.com' },
      { '@type': 'ListItem', position: 2, name: 'Quien Somos', item: 'https://solovivelo.com/quien-somos' },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen">
        {/* Breadcrumb */}
        <nav className="bg-white border-b" aria-label="Breadcrumb">
          <div className="container mx-auto px-4 py-3 text-sm text-muted-foreground">
            <Link href="/" className="text-deep-purple hover:underline">Inicio</Link>
            <span className="mx-2">›</span>
            <span className="font-semibold">Quien Somos</span>
          </div>
        </nav>

        {/* Hero */}
        <header className="bg-gradient-to-br from-deep-purple to-indigo-900 text-white py-20 md:py-24 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">
              Tu evento merece lo mejor.<br />
              <span className="text-gold">Nosotros te conectamos.</span>
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 leading-relaxed">
              Vivelo es el marketplace mexicano que conecta a personas que quieren hacer su evento con proveedores verificados de catering, audio, decoracion, fotografia, staff y mobiliario — todo en una sola plataforma.
            </p>
          </div>
        </header>

        <main>
          {/* Mision y Vision */}
          <section className="bg-off-white py-16 md:py-20">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-deep-purple mb-4">Por que existe Vivelo</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mb-10">
                Organizar un evento en Mexico solia significar semanas de busqueda, decenas de llamadas y cero garantias. Creamos Vivelo para cambiar eso.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 shadow-sm border-t-4 border-gold">
                  <h3 className="text-xl font-bold text-deep-purple mb-3 flex items-center gap-2">
                    <span>🎯</span> Nuestra Mision
                  </h3>
                  <p className="leading-relaxed">
                    Democratizar el acceso a servicios profesionales para eventos en Mexico, conectando a cualquier persona que quiera celebrar con proveedores verificados a traves de una plataforma transparente donde comparar, cotizar y reservar sea tan facil como unos cuantos clics. Creemos que cada celebracion — desde una boda intima hasta un evento corporativo de 500 personas — merece proveedores confiables sin importar el presupuesto.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-sm border-t-4 border-gold">
                  <h3 className="text-xl font-bold text-deep-purple mb-3 flex items-center gap-2">
                    <span>🚀</span> Nuestra Vision
                  </h3>
                  <p className="leading-relaxed">
                    Ser la plataforma lider de servicios para eventos en Latinoamerica, impulsando a miles de proveedores independientes a crecer su negocio mientras facilitamos que millones de personas vivan experiencias memorables. Queremos que pensar en &quot;organizar un evento&quot; y pensar en &quot;Vivelo&quot; sea lo mismo.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Como funciona */}
          <section className="py-16 md:py-20 text-center">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-deep-purple mb-4">Como funciona Vivelo</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
                Reservar servicios para tu evento en 3 pasos simples — sin llamadas interminables, sin sorpresas en el precio.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: 1,
                    title: 'Explora y compara',
                    desc: 'Busca entre proveedores verificados filtrando por categoria, zona y presupuesto. Cada perfil muestra fotos reales, precios transparentes, resenas de otros clientes y extras disponibles. Tambien puedes pedirle a Vivi, nuestra asistente con inteligencia artificial, que te recomiende opciones segun tu tipo de evento y numero de invitados.',
                  },
                  {
                    step: 2,
                    title: 'Arma tu evento',
                    desc: 'Agrega los servicios que necesitas al carrito y personaliza cada uno con extras opcionales. Indica fecha, horario, numero de invitados y la direccion de tu evento. Vivelo verifica la disponibilidad del proveedor en tiempo real y valida que cubra tu zona geografica antes de continuar.',
                  },
                  {
                    step: 3,
                    title: 'Paga seguro y disfruta',
                    desc: 'Realiza tu pago en linea con tarjeta de credito o debito a traves de Stripe, con proteccion para ti y para el proveedor. Cada reserva queda confirmada al instante, y si tus planes cambian, aplican politicas de cancelacion claras con reembolso proporcional.',
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-off-white rounded-2xl p-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-deep-purple text-gold text-xl font-extrabold mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-deep-purple mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Social proof */}
          <section className="py-16 md:py-20 border-y text-center">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-deep-purple mb-4">Vivelo en numeros</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
                Estamos construyendo el ecosistema de eventos mas grande del centro de Mexico. Cada numero refleja proveedores reales, zonas reales y categorias en las que ya puedes reservar.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { number: '9+', label: 'Zonas de cobertura en el centro de Mexico' },
                  { number: '6', label: 'Categorias de servicio especializadas' },
                  { number: '100%', label: 'Pagos protegidos y verificados via Stripe' },
                  { number: '24/7', label: 'Asistente Vivi con IA para ayudarte a elegir' },
                ].map((stat) => (
                  <div key={stat.label} className="py-4">
                    <div className="text-3xl md:text-4xl font-extrabold text-deep-purple mb-1">{stat.number}</div>
                    <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Categorias */}
          <section className="bg-deep-purple text-white py-16 md:py-20 text-center">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-gold mb-4">Servicios para cada tipo de evento</h2>
              <p className="text-white/90 text-lg max-w-2xl mx-auto mb-10">
                Desde una fiesta de cumpleanos hasta un congreso empresarial, tenemos proveedores especializados en 6 categorias clave.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {[
                  { icon: '🍽️', title: 'Alimentos y Bebidas', desc: 'Catering, banquetes, barras de bebidas, coffee breaks y menus personalizados.' },
                  { icon: '🎵', title: 'Audio e Iluminacion', desc: 'Sonido profesional, DJ, microfonia, iluminacion ambiental y efectos especiales.' },
                  { icon: '🎨', title: 'Decoracion', desc: 'Ambientacion, arreglos florales, centros de mesa, globos y escenografia tematica.' },
                  { icon: '📸', title: 'Foto y Video', desc: 'Fotografos, videografos, cabinas de fotos, drones y edicion profesional.' },
                  { icon: '👥', title: 'Staff', desc: 'Meseros, hostess, coordinadores de evento, seguridad y personal de apoyo.' },
                  { icon: '🪑', title: 'Mobiliario', desc: 'Mesas, sillas, carpas, lounge, tarimas, pistas de baile y accesorios.' },
                ].map((cat) => (
                  <div key={cat.title} className="bg-white/[0.08] border border-white/[0.12] rounded-xl p-7 hover:bg-white/[0.14] transition-colors">
                    <div className="text-3xl mb-3">{cat.icon}</div>
                    <h3 className="text-base font-semibold mb-2">{cat.title}</h3>
                    <p className="text-sm text-white/90">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Proveedores */}
          <section className="bg-gradient-to-br from-gold to-amber-500 py-16 md:py-20 text-center">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-deep-purple mb-4">Eres proveedor de servicios para eventos?</h2>
              <p className="text-lg max-w-xl mx-auto mb-8">
                Unite a Vivelo y conecta con miles de clientes que buscan exactamente lo que tu ofreces para su proximo evento. Sin cuotas de entrada — solo creces cuando vendes.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {['Registro gratuito', 'Pagos seguros via Stripe', 'Gestion de reservas y calendario', 'Visibilidad en 9 zonas del centro de Mexico'].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 font-semibold text-deep-purple text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="20 6 9 17 4 12" /></svg>
                    {benefit}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="https://nuevosproveedores.solovivelo.com"
                  className="inline-block bg-deep-purple text-white font-bold text-lg px-10 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Registra tu negocio
                </Link>
                <Link
                  href="/servicios"
                  className="inline-block bg-white text-deep-purple font-bold text-base px-9 py-3.5 rounded-xl border-2 border-deep-purple hover:bg-off-white transition-colors"
                >
                  Explorar servicios
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
