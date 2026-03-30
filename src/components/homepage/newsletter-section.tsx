'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Mail } from 'lucide-react';
import { useNewsletterSubscribe, isNewsletterSubscribed } from '@/hooks/use-newsletter-subscribe';

export function NewsletterSection() {
  const { email, setEmail, status, errorMsg, handleSubmit } = useNewsletterSubscribe();
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  useEffect(() => {
    if (isNewsletterSubscribed()) {
      setAlreadySubscribed(true);
    }
  }, []);

  if (alreadySubscribed) return null;

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
