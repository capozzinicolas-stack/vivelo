'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Film } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaGalleryProps {
  images: string[];
  videos: string[];
  title: string;
}

export function MediaGallery({ images, videos, title }: MediaGalleryProps) {
  const items: MediaItem[] = [
    ...images.map((url) => ({ url, type: 'image' as const })),
    ...videos.map((url) => ({ url, type: 'video' as const })),
  ];

  const [current, setCurrent] = useState(0);

  if (items.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? items.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === items.length - 1 ? 0 : c + 1));
  const item = items[current];

  return (
    <div className="space-y-3">
      {/* Main display */}
      <div className="relative group rounded-xl overflow-hidden bg-black">
        {item.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={`${title} ${current + 1}`} className="w-full h-64 md:h-96 object-contain" />
        ) : (
          <video src={item.url} className="w-full h-64 md:h-96 object-contain" controls />
        )}

        {items.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full shadow-lg"
              onClick={prev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full shadow-lg"
              onClick={next}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {current + 1} / {items.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button
              key={it.url}
              type="button"
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {it.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
