'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">Algo salio mal</h2>
          <p className="text-muted-foreground">Hubo un error inesperado. Por favor intenta de nuevo.</p>
          <Button onClick={reset}>Reintentar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
