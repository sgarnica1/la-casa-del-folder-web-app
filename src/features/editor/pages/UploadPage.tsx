import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, Loading, Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import type { Layout, UploadedImage } from '@/types';

interface UploadingImage {
  file: File;
  previewUrl: string;
  slotIndex?: number;
}

export function UploadPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Map<number, UploadingImage>>(new Map());
  const toast = useToast();

  useEffect(() => {
    console.log('[UploadPage] Mounted/Updated', { draftId });

    if (!draftId) {
      console.log('[UploadPage] No draftId, returning');
      return;
    }

    const loadData = async () => {
      console.log('[UploadPage] Loading data for draft:', draftId);
      try {
        const [, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);
        console.log('[UploadPage] Data loaded successfully');
        setLayout(layoutData);
      } catch (err) {
        console.error('[UploadPage] Error loading data:', err);
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [draftId, toast]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setIsUploading(true);

    // Create preview URLs and track uploading images
    const newUploadingImages = new Map<number, UploadingImage>();
    const currentSlotIndex = uploadedImages.length;

    fileArray.forEach((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      const slotIndex = currentSlotIndex + index;
      newUploadingImages.set(slotIndex, { file, previewUrl, slotIndex });
    });

    setUploadingImages(newUploadingImages);

    const successfulImages: UploadedImage[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    try {
      const uploadPromises = fileArray.map(async (file, index) => {
        const slotIndex = currentSlotIndex + index;
        try {
          const result = await apiClient.uploadImage(file);
          const image: UploadedImage = { id: result.id, url: result.url };
          successfulImages.push(image);
          addImages([image]);

          // Remove from uploading map
          setUploadingImages((prev) => {
            const updated = new Map(prev);
            updated.delete(slotIndex);
            return updated;
          });

          // Clean up preview URL
          const uploadingImg = newUploadingImages.get(slotIndex);
          if (uploadingImg) {
            URL.revokeObjectURL(uploadingImg.previewUrl);
          }

          return { success: true, image };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
          errors.push({ fileName: file.name, error: errorMessage });

          // Remove from uploading map on error
          setUploadingImages((prev) => {
            const updated = new Map(prev);
            updated.delete(slotIndex);
            return updated;
          });

          // Clean up preview URL
          const uploadingImg = newUploadingImages.get(slotIndex);
          if (uploadingImg) {
            URL.revokeObjectURL(uploadingImg.previewUrl);
          }

          return { success: false, error: errorMessage };
        }
      });

      await Promise.allSettled(uploadPromises);

      if (successfulImages.length > 0) {
        toast.success(
          `${successfulImages.length} imagen${successfulImages.length !== 1 ? 'es' : ''} subida${successfulImages.length !== 1 ? 's' : ''} exitosamente`
        );
      }

      if (errors.length > 0) {
        errors.forEach((err) => {
          toast.error(`Error al subir ${err.fileName}: ${err.error}`);
        });
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setIsUploading(false);
      setUploadingImages(new Map());
      event.target.value = '';
    }
  };

  const handleContinue = () => {
    console.log('[UploadPage] handleContinue called', { draftId });
    if (draftId) {
      const targetUrl = `/draft/${draftId}/edit`;
      console.log('[UploadPage] Navigating to:', targetUrl);
      navigate(targetUrl);
    }
  };

  if (isLoading) {
    return (
      <>
        <DraftEditorHeader />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <Skeleton key={i} className="aspect-square w-full" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const requiredCount = layout?.slots.filter((s) => s.required).length || 0;
  const hasMinimumImages = uploadedImages.length >= requiredCount;

  return (
    <>
      <DraftEditorHeader
        onContinue={handleContinue}
        continueLabel="Continuar"
        continueDisabled={!hasMinimumImages || isUploading}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Subir imágenes</h2>
            <p className="text-muted-foreground mt-2">
              Selecciona <strong>{requiredCount} imágenes</strong> para empezar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Puedes cambiarlas más adelante
            </p>
          </div>

          {layout && (() => {
            // Sort slots by extracting number from name (Slot 1, Slot 2, etc.)
            const sortedSlots = [...layout.slots].sort((a, b) => {
              // Check for portada/cover first
              const aIsCover = a.name.toLowerCase().includes('portada') || a.name.toLowerCase().includes('cover');
              const bIsCover = b.name.toLowerCase().includes('portada') || b.name.toLowerCase().includes('cover');

              if (aIsCover && !bIsCover) return -1;
              if (!aIsCover && bIsCover) return 1;

              // Extract numbers from slot names (Slot 1, Slot 10, mes 1, month 1, etc.)
              const aMatch = a.name.match(/(?:slot|mes|month)\s*(\d+)/i);
              const bMatch = b.name.match(/(?:slot|mes|month)\s*(\d+)/i);

              if (aMatch && bMatch) {
                return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
              }

              // Fallback to string comparison
              return a.name.localeCompare(b.name);
            });

            const coverSlot = sortedSlots.find(s =>
              s.name.toLowerCase().includes('portada') || s.name.toLowerCase().includes('cover')
            );
            const monthSlots = sortedSlots.filter(s =>
              !s.name.toLowerCase().includes('portada') &&
              !s.name.toLowerCase().includes('cover')
            );

            const totalImages = uploadedImages.length + uploadingImages.size;
            const hasAnyImages = totalImages > 0;

            // If no images uploaded, show only add button
            if (!hasAnyImages) {
              return (
                <div className="flex items-center justify-center py-12">
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('image-upload-input') as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={isUploading}
                    size="lg"
                    className="bg-gray-800 hover:bg-gray-900 text-white"
                  >
                    Seleccionar imágenes
                  </Button>
                </div>
              );
            }

            // Show grid with images and empty slots
            return (
              <div className="space-y-6">
                {coverSlot && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Portada
                    </div>
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30">
                      {uploadedImages.length > 0 ? (
                        <img
                          src={uploadedImages[0].url}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : uploadingImages.has(0) ? (
                        <>
                          <img
                            src={uploadingImages.get(0)!.previewUrl}
                            alt="Uploading cover"
                            className="w-full h-full object-cover opacity-70"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Loading size="sm" className="text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          Agregar foto para Portada
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {/* Add More button placeholder at the beginning */}
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('image-upload-input') as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={isUploading}
                    className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30 shadow-sm hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </button>

                  {monthSlots.map((slot, index) => {
                    const imageIndex = coverSlot ? index + 1 : index;
                    const uploadedImage = uploadedImages[imageIndex] || null;
                    const uploadingImage = uploadingImages.get(imageIndex);

                    return (
                      <div key={slot.id} className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30 shadow-sm">
                        {uploadedImage ? (
                          <img
                            src={uploadedImage.url}
                            alt={slot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : uploadingImage ? (
                          <>
                            <img
                              src={uploadingImage.previewUrl}
                              alt={`Uploading ${slot.name}`}
                              className="w-full h-full object-cover opacity-70"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Loading size="sm" className="text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                            Agregar foto para {slot.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
        id="image-upload-input"
      />
    </>
  );
}
