'use client';

import { useState, useEffect } from 'react';
import { Share2, MessageCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ShareButton({ url, title, text }: ShareButtonProps) {
  const { toast } = useToast();
  const [canNativeShare, setCanNativeShare] = useState(false);

  const fullUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com'}${url}`;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url: fullUrl });
    } catch {
      // User cancelled or error — no action needed
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({ title: 'Link copiado' });
    } catch {
      toast({ title: 'No se pudo copiar el link', variant: 'destructive' });
    }
  };

  if (canNativeShare) {
    return (
      <Button variant="outline" size="icon" onClick={handleNativeShare} aria-label="Compartir">
        <Share2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Compartir">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(title)}%20${encodeURIComponent(fullUrl)}`, '_blank')}>
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`, '_blank')}>
          <FacebookIcon />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`, '_blank')}>
          <XIcon />
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4" />
          Copiar link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
