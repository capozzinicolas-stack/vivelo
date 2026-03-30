'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Gift } from 'lucide-react';

const SESSION_KEY = 'vivelo-exit-intent-shown';
const LS_SUBSCRIBED_KEY = 'vivelo-newsletter-subscribed';

function useExitIntent() {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // Don't trigger if already shown this session or already subscribed
    if (sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LS_SUBSCRIBED_KEY)) {
      return;
    }

    // Desktop: detect mouse leaving viewport from the top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setTriggered(true);
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    };

    // Mobile: trigger after 30s of inactivity
    let inactivityTimer: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        setTriggered(true);
        sessionStorage.setItem(SESSION_KEY, '1');
      }, 30000);
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', resetTimer, { passive: true });
    window.addEventListener('touchstart', resetTimer, { passive: true });
    resetTimer();

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearTimeout(inactivityTimer);
    };
  }, []);

  return triggered;
}

export function ExitIntentPopup() {
  const triggered = useExitIntent();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (triggered && !localStorage.getItem(LS_SUBSCRIBED_KEY)) {
      setOpen(true);
    }
  }, [triggered]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      localStorage.setItem(LS_SUBSCRIBED_KEY, '1');
      setTimeout(() => setOpen(false), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al suscribir');
    }
  }, [email, status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-5 w-5 text-deep-purple" />
            No te vayas sin ver nuestras ofertas!
          </DialogTitle>
        </DialogHeader>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">Gracias por suscribirte!</p>
            <p className="text-sm text-muted-foreground">Recibiras las mejores ofertas en tu correo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Suscribete y recibe descuentos exclusivos en los mejores servicios para tu evento.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder="Tu correo electronico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="bg-gradient-to-r from-deep-purple to-pink-600 hover:from-deep-purple/90 hover:to-pink-600/90"
              >
                {status === 'loading' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</>
                ) : (
                  'Suscribirme'
                )}
              </Button>
              {status === 'error' && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
