import { useState, useCallback } from 'react';

const LS_SUBSCRIBED_KEY = 'vivelo-newsletter-subscribed';

export function isNewsletterSubscribed(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(LS_SUBSCRIBED_KEY);
}

export function useNewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Error al suscribir');
    }
  }, [email, status]);

  return { email, setEmail, status, errorMsg, handleSubmit };
}
