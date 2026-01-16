import { ReactNode } from 'react';
import { UploadedImagesProvider } from '@/contexts/UploadedImagesContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <UploadedImagesProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">La Casa Del Folder</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </UploadedImagesProvider>
  );
}
