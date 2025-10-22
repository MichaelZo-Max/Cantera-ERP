"use client";

import { cn } from "@/lib/utils";

export const Footer = ({ className }: { className?: string }) => {
  return (
    // Se cambió "bg-card" a "bg-card/80 backdrop-blur-sm" para que coincida con el header.
    <footer
      className={cn(
        "bg-card/80 backdrop-blur-sm border-t border-border/50",
        className
      )}
    >
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Cantera ERP. Todos los derechos
            reservados.
          </p>                                                                                                                                                                                                                                                                                                                                                                               
          <p>
            Hecho con 💖 por{" "}
            <a
              href="https://redesip.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Redes IP
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
