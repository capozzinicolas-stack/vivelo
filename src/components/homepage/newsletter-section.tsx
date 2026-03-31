'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
    <section className="border-t bg-off-white py-10">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl">
        {status === 'success' ? (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Gracias por suscribirte!</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground shrink-0">Recibe ofertas exclusivas para tu proximo evento</p>
            <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
              <Input
                type="email"
                placeholder="Tu correo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-9 w-full sm:w-56"
              />
              <Button
                type="submit"
                size="sm"
                disabled={status === 'loading'}
                className="shrink-0"
              >
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Suscribirme'
                )}
              </Button>
            </form>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-500 text-xs">{errorMsg}</p>
        )}
      </div>
    </section>
  );
}
