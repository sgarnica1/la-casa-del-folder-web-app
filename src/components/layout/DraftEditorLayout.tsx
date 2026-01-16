import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { useApiClient } from '@/hooks/useApiClient';
import { UploadedImagesProvider } from '@/contexts/UploadedImagesContext';

interface DraftEditorLayoutProps {
  children: ReactNode;
}

export function DraftEditorLayout({ children }: DraftEditorLayoutProps) {
  useApiClient();

  return (
    <UploadedImagesProvider>
      {children}
      <Toaster position="top-right" richColors />
    </UploadedImagesProvider>
  );
}
