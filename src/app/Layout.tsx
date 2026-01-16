import { ReactNode } from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { UploadedImagesProvider } from '@/contexts/UploadedImagesContext';
import { useApiClient } from '@/hooks/useApiClient';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  useApiClient();

  return (
    <UploadedImagesProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">La Casa Del Folder</h1>
            <div className="flex items-center gap-2">
              <SignedOut>
                <SignInButton />
                <SignUpButton />
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </UploadedImagesProvider>
  );
}
