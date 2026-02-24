'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalCarouselProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  arrowSize?: 'sm' | 'md' | 'lg';
}

export function HorizontalCarousel({
  children,
  className,
  showArrows = true,
  arrowSize = 'lg',
}: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const arrowSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        className={cn(
          'flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory',
          className
        )}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {showArrows && canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-full bg-deep-purple text-white shadow-lg flex items-center justify-center hover:bg-deep-purple/90 transition-all opacity-0 group-hover:opacity-100',
            arrowSizeClasses[arrowSize]
          )}
          aria-label="Anterior"
        >
          <ChevronLeft className={iconSizeClasses[arrowSize]} />
        </button>
      )}

      {showArrows && canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 rounded-full bg-deep-purple text-white shadow-lg flex items-center justify-center hover:bg-deep-purple/90 transition-all opacity-0 group-hover:opacity-100',
            arrowSizeClasses[arrowSize]
          )}
          aria-label="Siguiente"
        >
          <ChevronRight className={iconSizeClasses[arrowSize]} />
        </button>
      )}
    </div>
  );
}

interface FilterPillsProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

export function FilterPills({ options, selected, onSelect, className }: FilterPillsProps) {
  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'px-4 py-1.5 rounded-full border text-sm font-medium transition-colors whitespace-nowrap',
            selected === opt.value
              ? 'bg-deep-purple text-white border-deep-purple'
              : 'bg-white text-foreground border-border hover:border-deep-purple hover:text-deep-purple'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
