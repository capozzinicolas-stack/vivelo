import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Vivelo</Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Terminos</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacidad</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; 2025 Vivelo PR. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
