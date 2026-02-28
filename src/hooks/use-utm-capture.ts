'use client';

import { useEffect } from 'react';

const UTM_STORAGE_KEY = 'vivelo-utm';

interface UtmData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string;
  referrer: string;
  captured_at: string;
}

export function useUtmCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only capture on first visit (don't overwrite)
    const existing = localStorage.getItem(UTM_STORAGE_KEY);
    if (existing) return;

    const params = new URLSearchParams(window.location.search);
    const hasUtm = params.has('utm_source') || params.has('utm_medium') || params.has('utm_campaign');

    if (!hasUtm && !document.referrer) return;

    const utmData: UtmData = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_term: params.get('utm_term'),
      utm_content: params.get('utm_content'),
      landing_page: window.location.pathname,
      referrer: document.referrer,
      captured_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
    } catch {
      // localStorage full or unavailable
    }
  }, []);
}

export function getStoredUtmData(): UtmData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredUtmData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(UTM_STORAGE_KEY);
}
