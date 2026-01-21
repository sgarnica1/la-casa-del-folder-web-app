import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { Button, Skeleton } from '@/components/ui';
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
  // Track upload order: maps upload position -> image ID (once uploaded)
  const [uploadOrderMap, setUploadOrderMap] = useState<Map<number, string>>(new Map());
  const toast = useToast();

  useEffect(() => {
    if (!draftId) {
      return;
    }

    const loadData = async () => {
      try {
        const [, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);
        setLayout(layoutData);
      } catch (err) {
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
    const MAX_IMAGES = 20;
    const currentImageCount = uploadedImages.length + uploadingImages.size;
    const remainingSlots = MAX_IMAGES - currentImageCount;

    if (remainingSlots <= 0) {
      sonnerToast.error(`Ya has alcanzado el límite de ${MAX_IMAGES} fotos.`);
      event.target.value = '';
      return;
    }

    if (fileArray.length > remainingSlots) {
      sonnerToast.error(`Solo puedes subir ${remainingSlots} foto${remainingSlots !== 1 ? 'es' : ''} más (máximo ${MAX_IMAGES} total).`);
      event.target.value = '';
      return;
    }

    const invalidFiles = fileArray.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(() => {
        sonnerToast.error(`Tipo de archivo inválido. Solo se permiten archivos de foto.`);
      });
      event.target.value = '';
      return;
    }

    setIsUploading(true);

    // Create preview URLs and track uploading images
    const newUploadingImages = new Map<number, UploadingImage>();
    const currentSlotIndex = uploadedImages.length;

    fileArray.forEach((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      const slotIndex = currentSlotIndex + index;
      newUploadingImages.set(slotIndex, { file, previewUrl, slotIndex });
    });

    // Merge with existing uploading images
    setUploadingImages((prev) => {
      const merged = new Map(prev);
      newUploadingImages.forEach((value, key) => {
        merged.set(key, value);
      });
      return merged;
    });

    const successfulImages: UploadedImage[] = [];
    const errors: Array<{ fileName: string; error: string; slotIndex?: number }> = [];

    // Upload images in batches to prevent Cloudinary timeouts
    const BATCH_SIZE = 5; // Upload 5 images at a time (increased for better throughput)
    const BATCH_DELAY_MS = 200; // Wait 200ms between batches (reduced delay)

    try {
      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (file, batchIndex) => {
          const fileIndex = i + batchIndex;
          const slotIndex = currentSlotIndex + fileIndex;
          try {
            const result = await apiClient.uploadImage(file);
            const image: UploadedImage = { id: result.id, url: result.url };
            successfulImages.push(image);

            // Store upload order for positioning
            setUploadOrderMap((prev) => {
              const updated = new Map(prev);
              updated.set(slotIndex, image.id);
              return updated;
            });
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

            return { success: true, image, slotIndex };
          } catch (err) {
            let errorMessage = 'Error al subir la foto';
            if (err instanceof Error) {
              const message = err.message.toLowerCase();
              if (message.includes('tipo de archivo') || message.includes('invalid file') || message.includes('file type')) {
                errorMessage = 'Tipo de archivo inválido. Solo se permiten archivos de foto.';
              } else if (message.includes('timeout')) {
                errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
              } else {
                errorMessage = err.message;
              }
            }
            errors.push({ fileName: file.name, error: errorMessage, slotIndex });

            // Keep in uploading map on error so user can see which one failed
            // Only remove after some time or let user retry
            setTimeout(() => {
              setUploadingImages((prev) => {
                const updated = new Map(prev);
                updated.delete(slotIndex);
                return updated;
              });
            }, 5000);

            // Clean up preview URL
            const uploadingImg = newUploadingImages.get(slotIndex);
            if (uploadingImg) {
              URL.revokeObjectURL(uploadingImg.previewUrl);
            }

            return { success: false, error: errorMessage, slotIndex };
          }
        });

        // Wait for current batch to complete
        await Promise.allSettled(batchPromises);

        // Wait before starting next batch (except for the last batch)
        if (i + BATCH_SIZE < fileArray.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      if (successfulImages.length > 0) {
        toast.success(
          `${successfulImages.length} foto${successfulImages.length !== 1 ? 's' : ''} subida${successfulImages.length !== 1 ? 's' : ''} exitosamente`
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
    if (draftId) {
      const targetUrl = `/draft/${draftId}/edit`;
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
      >
        {layout && (() => {
          const MAX_IMAGES = 20;
          const totalUploaded = Math.min(uploadedImages.length, MAX_IMAGES);
          // const totalWithUploading = Math.min(uploadedImages.length + uploadingImages.size, MAX_IMAGES);
          return (
            <div className="flex flex-col text-sm text-black">
              <span className="font-medium">
                {totalUploaded} / {requiredCount} fotos subidas
              </span>
            </div>
          );
        })()}
      </DraftEditorHeader>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {layout && (() => {
          const totalImages = uploadedImages.length + uploadingImages.size;
          const hasAnyImages = totalImages > 0;
          const maxImages = 20;

          // If no images uploaded, show centered empty state
          if (!hasAnyImages) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl mb-6 text-black font-semibold">
                    Selecciona {requiredCount} fotos para empezar
                  </h2>
                  <p className="text-md text-muted-foreground">
                    No te preocupes, puedes cambiarlas más adelante.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('image-upload-input') as HTMLInputElement;
                    input?.click();
                  }}
                  disabled={isUploading}
                  size="lg"
                  variant="secondary"
                  className="w-auto"
                >
                  Seleccionar fotos
                </Button>
              </div>
            );
          }

          // Display all uploaded images up to maxImages
          const imagesToShow = uploadedImages.slice(0, maxImages);

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl text-black font-semibold">
                  Subir fotos
                </h2>
                <p className="text-muted-foreground mt-2">
                  Selecciona mínimo
                  <strong className="text-primary"> {requiredCount}</strong> fotos para continuar.
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Puedes cambiarlas más adelante.
                </p>

                <span className="block text-sm md:text-lg text-primary mt-10 font-semibold">
                  {Math.min(uploadedImages.length, maxImages)} / {requiredCount} fotos
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Display images maintaining their positions */}
                {(() => {
                  const startIndex = 0;
                  const slots: Array<{ type: 'uploaded' | 'uploading'; image?: UploadedImage; uploadingImage?: UploadingImage; index: number }> = [];

                  // Create a map of uploaded images by their upload position
                  const uploadedImagesBySlot = new Map<number, UploadedImage>();
                  uploadOrderMap.forEach((imageId, uploadPosition) => {
                    const image = imagesToShow.find((img) => img.id === imageId);
                    if (image) {
                      uploadedImagesBySlot.set(uploadPosition, image);
                    }
                  });

                  // For images not yet in uploadOrderMap (from context), assign them to next available position
                  let nextAvailablePosition = startIndex;
                  imagesToShow.forEach((img) => {
                    if (!Array.from(uploadOrderMap.values()).includes(img.id)) {
                      while (uploadedImagesBySlot.has(nextAvailablePosition) || uploadingImages.has(nextAvailablePosition)) {
                        nextAvailablePosition++;
                      }
                      uploadedImagesBySlot.set(nextAvailablePosition, img);
                      nextAvailablePosition++;
                    }
                  });

                  // Create a set of all indices that should be displayed
                  const indicesToDisplay = new Set<number>();
                  uploadedImagesBySlot.forEach((_, index) => indicesToDisplay.add(index));
                  uploadingImages.forEach((_, index) => indicesToDisplay.add(index));

                  // Create array of all slots with their images in order (up to maxImages)
                  const sortedIndices = Array.from(indicesToDisplay).sort((a, b) => a - b);
                  sortedIndices.forEach((i) => {
                    if (i >= startIndex && i < maxImages) {
                      const uploadedImg = uploadedImagesBySlot.get(i);
                      const uploadingImg = uploadingImages.get(i);

                      if (uploadedImg) {
                        slots.push({ type: 'uploaded', image: uploadedImg, index: i });
                      } else if (uploadingImg) {
                        slots.push({ type: 'uploading', uploadingImage: uploadingImg, index: i });
                      }
                    }
                  });

                  return slots.map((slot) => {
                    if (slot.type === 'uploaded' && slot.image) {
                      return (
                        <div key={slot.image.id} className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-border bg-muted/30 shadow-sm">
                          <img
                            src={slot.image.url}
                            alt={`Image ${slot.index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                      );
                    } else if (slot.type === 'uploading' && slot.uploadingImage) {
                      return (
                        <div key={`uploading-${slot.index}`} className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30 shadow-sm">
                          <img
                            src={slot.uploadingImage.previewUrl}
                            alt={`Uploading ${slot.index + 1}`}
                            className="w-full h-full object-cover opacity-70"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  });
                })()}

                {/* Add More button at the end, after all images */}
                {totalImages < maxImages && (
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
                )}
              </div>
            </div>
          );
        })()}
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
