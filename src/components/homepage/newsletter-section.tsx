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
    <section className="bg-deep-purple py-12">
      <div className="container mx-auto px-4 max-w-xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gold" />
          <h3 className="text-lg font-bold text-white">Ofertas exclusivas para tu evento</h3>
        </div>
        <p className="text-white/90 text-sm mb-5">Recibe promociones y novedades directo en tu correo</p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 text-gold">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Gracias por suscribirte!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <Input
              type="email"
              placeholder="Tu correo electronico"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-gold h-10"
            />
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 bg-gold text-deep-purple font-bold hover:bg-gold/90 h-10"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
