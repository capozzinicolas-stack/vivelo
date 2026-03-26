'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Eye,
  CalendarCheck,
  ShieldCheck,
  LayoutDashboard,
  BadgeDollarSign,
  HeadphonesIcon,
  UserPlus,
  CalendarSearch,
  TrendingUp,
  UtensilsCrossed,
  Speaker,
  Flower2,
  Camera,
  Users,
  Armchair,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface LandingPageProps {
  faqItems: FAQItem[];
}

const REGISTER_URL = 'https://solovivelo.com/register?role=provider';

const benefits = [
  {
    icon: Eye,
    title: 'Más Visibilidad',
    description: 'Aparece frente a miles de clientes buscando servicios para sus eventos.',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas Automáticas',
    description: 'Los clientes reservan y pagan directo, sin intermediarios ni llamadas.',
  },
  {
    icon: ShieldCheck,
    title: 'Cobros Seguros',
    description: 'Pagos procesados con Stripe, depósito directo a tu cuenta bancaria.',
  },
  {
    icon: LayoutDashboard,
    title: 'Gestión Simple',
    description: 'Dashboard para manejar tus servicios, reservas y calendario en un solo lugar.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Sin Cuota Mensual',
    description: 'Solo pagas una comisión cuando vendes. Cero riesgo para tu negocio.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Soporte Dedicado',
    description: 'El equipo Vivelo te acompaña para que crezcas y tengas éxito.',
  },
];

const steps = [
  {
    icon: UserPlus,
    number: 1,
    title: 'Crea tu Perfil',
    description: 'Registra tu negocio y sube tus servicios con fotos y precios.',
  },
  {
    icon: CalendarSearch,
    number: 2,
    title: 'Recibe Reservas',
    description: 'Los clientes te encuentran, eligen fecha y pagan en línea.',
  },
  {
    icon: TrendingUp,
    number: 3,
    title: 'Cobra y Crece',
    description: 'Recibe tus pagos de forma segura y haz crecer tu negocio.',
  },
];

const categories = [
  { icon: UtensilsCrossed, label: 'Catering' },
  { icon: Speaker, label: 'Audio e Iluminación' },
  { icon: Flower2, label: 'Decoración' },
  { icon: Camera, label: 'Foto y Video' },
  { icon: Users, label: 'Staff' },
  { icon: Armchair, label: 'Mobiliario' },
];

export function LandingPage({ faqItems }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf7f4]">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="https://solovivelo.com" className="flex items-center">
            <Image
              src={scrolled ? '/logo-vivelo.png' : '/logo-vivelo-white.png'}
              alt="Vivelo"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <Link
            href={REGISTER_URL}
            className="bg-[#ecbe38] hover:bg-[#d4a82e] text-[#43276c] font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Registrarme Gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#43276c] via-[#5a3a8a] to-[#43276c]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#ecbe38] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#ecbe38] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Haz Crecer tu Negocio de Eventos con{' '}
            <span className="text-[#ecbe38]">Vivelo</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Únete a la plataforma líder en México. Recibe reservas, gestiona tu agenda y cobra de
            forma segura — todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={REGISTER_URL}
              className="inline-flex items-center justify-center bg-[#ecbe38] hover:bg-[#d4a82e] text-[#43276c] font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
            >
              Empieza Gratis Hoy
            </Link>
            <button
              onClick={() =>
                document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="inline-flex items-center justify-center border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Ver cómo funciona
            </button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#43276c] text-center mb-4">
            ¿Por qué elegir Vivelo?
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Todo lo que necesitas para llevar tu negocio de eventos al siguiente nivel.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-[#43276c]/10 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-[#43276c]" />
                </div>
                <h3 className="text-lg font-semibold text-[#43276c] mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-20 bg-[#fcf7f4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#43276c] text-center mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            En tres simples pasos estarás recibiendo reservas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line - desktop only */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-[#ecbe38]" />
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="relative z-10 w-24 h-24 rounded-full bg-[#ecbe38] flex items-center justify-center mb-6 shadow-lg">
                  <step.icon className="w-10 h-10 text-[#43276c]" />
                </div>
                <span className="text-sm font-bold text-[#ecbe38] mb-2">Paso {step.number}</span>
                <h3 className="text-xl font-semibold text-[#43276c] mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#43276c] text-center mb-4">
            Categorías de Servicios
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Ofrece tus servicios en la categoría que mejor se adapte a tu negocio.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="inline-flex items-center gap-2 bg-[#fcf7f4] border border-[#43276c]/10 rounded-full px-5 py-2.5 text-sm font-medium text-[#43276c] hover:border-[#43276c]/30 transition-colors"
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[#fcf7f4]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-[#43276c] text-center mb-4">
            Preguntas Frecuentes
          </h2>
          <p className="text-gray-600 text-center mb-12">
            Resolvemos tus dudas antes de que empieces.
          </p>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-white rounded-xl border border-gray-100 px-6"
              >
                <AccordionTrigger className="text-left text-[#43276c] font-medium hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-[#43276c]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para Crecer?
          </h2>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Miles de clientes buscan servicios como los tuyos. Regístrate hoy y empieza a recibir
            reservas.
          </p>
          <Link
            href={REGISTER_URL}
            className="inline-flex items-center justify-center bg-[#ecbe38] hover:bg-[#d4a82e] text-[#43276c] font-bold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg"
          >
            Registrarme Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#3a2060] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Vivelo. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="https://solovivelo.com/terminos" className="hover:text-white/80 transition-colors">
              Términos
            </Link>
            <Link href="https://solovivelo.com/privacidad" className="hover:text-white/80 transition-colors">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>

      {/* WhatsApp Bubble */}
      <a
        href="https://wa.me/5215519080884"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] rounded-full flex items-center justify-center shadow-lg transition-colors"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.923 15.923 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.31 22.606c-.39 1.1-1.932 2.014-3.164 2.28-.844.18-1.946.322-5.656-1.216-4.748-1.966-7.804-6.782-8.038-7.098-.226-.316-1.9-2.53-1.9-4.826s1.2-3.426 1.628-3.896c.39-.428.916-.624 1.226-.624.15 0 .284.008.406.014.39.016.586.04.844.652.322.762 1.1 2.682 1.196 2.878.098.196.196.462.062.728-.126.274-.232.394-.428.62-.196.226-.382.398-.578.642-.18.214-.382.442-.16.862.224.42.994 1.638 2.132 2.654 1.464 1.308 2.698 1.714 3.082 1.902.384.188.608.16.832-.098.232-.258.988-1.148 1.252-1.544.258-.396.518-.328.87-.196.358.126 2.268 1.07 2.656 1.264.39.196.648.294.744.456.098.16.098.93-.292 2.03z" />
        </svg>
      </a>
    </div>
  );
}
