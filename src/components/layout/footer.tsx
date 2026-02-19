import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/"><Image src="/logo-vivelo.png" alt="Vivelo" width={100} height={30} className="h-7 w-auto" /></Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Terminos</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacidad</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; 2026 Vivelo MX. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
