import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { UploadedImage } from '@/types';

interface UploadedImagesContextType {
  images: UploadedImage[];
  addImages: (images: UploadedImage[]) => void;
  removeImage: (imageId: string) => void;
  clearImages: () => void;
}

const UploadedImagesContext = createContext<UploadedImagesContextType | undefined>(undefined);

export function UploadedImagesProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<UploadedImage[]>([]);

  const addImages = useCallback((newImages: UploadedImage[]) => {
    setImages((prev) => {
      const existingIds = new Set(prev.map((img) => img.id));
      const uniqueNewImages = newImages.filter((img) => !existingIds.has(img.id));
      const MAX_IMAGES = 20;
      const combined = [...prev, ...uniqueNewImages];
      return combined.slice(0, MAX_IMAGES);
    });
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return (
    <UploadedImagesContext.Provider value={{ images, addImages, removeImage, clearImages }}>
      {children}
    </UploadedImagesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUploadedImages() {
  const context = useContext(UploadedImagesContext);
  if (!context) {
    throw new Error('useUploadedImages must be used within UploadedImagesProvider');
  }
  return context;
}
