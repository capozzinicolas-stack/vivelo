'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-8">
      {/* Desktop: always visible */}
      <div className="hidden lg:block">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </div>
      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full text-left"
          aria-expanded={open}
        >
          <h2 className="text-xl font-semibold">{title}</h2>
          <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
        </button>
        {open && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}
