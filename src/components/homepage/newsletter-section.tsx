'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';

const LS_KEY = 'vivelo-newsletter-subscribed';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(LS_KEY)) {
      setAlreadySubscribed(true);
    }
  }, []);

  if (alreadySubscribed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al suscribir');
      }

      setStatus('success');
      localStorage.setItem(LS_KEY, '1');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al suscribir');
    }
  };

  return (
    <section className="bg-gradient-to-r from-deep-purple to-indigo-800 text-white py-16">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <Mail className="h-10 w-10 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Recibe ofertas exclusivas</h2>
        <p className="text-white/80 mb-8">Suscribete y recibe las mejores promociones en servicios para tu proximo evento</p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-white">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Gracias por suscribirte!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Tu correo electronico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={status === 'loading'}
              className="shrink-0"
            >
              {status === 'loading' ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</>
              ) : (
                'Suscribirme'
              )}
            </Button>
          </form>
        )}
        {status === 'error' && (
          <p className="text-red-300 text-sm mt-2">{errorMsg}</p>
        )}
      </div>
    </section>
  );
}
