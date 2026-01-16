import { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { Toaster } from 'sonner';
import { useApiClient } from '@/hooks/useApiClient';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  useApiClient();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t bg-white mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>&copy; {new Date().getFullYear()} La Casa Del Folder. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
