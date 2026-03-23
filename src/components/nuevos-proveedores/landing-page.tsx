'use client';

import { useState, useEffect } from 'react';
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
          <Link href="https://solovivelo.com" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">
              <span className={scrolled ? 'text-[#43276c]' : 'text-white'}>Vive</span>
              <span className="text-[#ecbe38]">lo</span>
            </span>
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
    </div>
  );
}
