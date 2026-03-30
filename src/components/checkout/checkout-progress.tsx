'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Resumen', step: 1 },
  { label: 'Pago', step: 2 },
  { label: 'Confirmacion', step: 3 },
];

export function CheckoutProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const isCompleted = s.step < currentStep;
        const isActive = s.step === currentStep;

        return (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-deep-purple text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : s.step}
              </div>
              <span
                className={`text-xs mt-1.5 ${
                  isActive ? 'font-semibold text-deep-purple' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-2 mb-5 ${
                  s.step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
