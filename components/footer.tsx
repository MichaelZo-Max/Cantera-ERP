// components/footer.tsx
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background/50 border-t border-border/50 mt-auto py-4">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
            <p>&copy; {currentYear} Cantera ERP. Todos los derechos reservados.</p>
        </div>
        <p className="mt-3">
          Hecho por <a href="https://redesip.org" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">@redesip</a>
        </p>
      </div>
    </footer>
  );
}