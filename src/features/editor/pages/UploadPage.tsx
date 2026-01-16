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
  // Track upload order: maps upload position -> image ID (once uploaded)
  const [uploadOrderMap, setUploadOrderMap] = useState<Map<number, string>>(new Map());
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

    console.log('[UploadPage] Starting upload', {
      fileCount: fileArray.length,
      currentSlotIndex,
      currentUploadedCount: uploadedImages.length,
      uploadingSlots: Array.from(uploadingImages.keys()),
    });

    fileArray.forEach((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      const slotIndex = currentSlotIndex + index;
      newUploadingImages.set(slotIndex, { file, previewUrl, slotIndex });
      console.log('[UploadPage] Created preview for slot', { slotIndex, fileName: file.name });
    });

    // Merge with existing uploading images
    setUploadingImages((prev) => {
      const merged = new Map(prev);
      newUploadingImages.forEach((value, key) => {
        merged.set(key, value);
      });
      console.log('[UploadPage] Total uploading slots after merge:', Array.from(merged.keys()));
      return merged;
    });

    const successfulImages: UploadedImage[] = [];
    const errors: Array<{ fileName: string; error: string; slotIndex?: number }> = [];

    // Upload images in batches to prevent Cloudinary timeouts
    const BATCH_SIZE = 3; // Upload 3 images at a time
    const BATCH_DELAY_MS = 500; // Wait 500ms between batches

    try {
      for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batch = fileArray.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (file, batchIndex) => {
          const fileIndex = i + batchIndex;
          const slotIndex = currentSlotIndex + fileIndex;
          try {
            console.log('[UploadPage] Starting upload for slot', { slotIndex, fileName: file.name });
            const result = await apiClient.uploadImage(file);
            const image: UploadedImage = { id: result.id, url: result.url };
            console.log('[UploadPage] Upload successful for slot', { slotIndex, imageId: image.id });
            successfulImages.push(image);

            // Store upload order for positioning
            setUploadOrderMap((prev) => {
              const updated = new Map(prev);
              updated.set(slotIndex, image.id);
              console.log('[UploadPage] Updated upload order map', { slotIndex, imageId: image.id, map: Array.from(updated.entries()) });
              return updated;
            });
            addImages([image]);

            // Remove from uploading map
            setUploadingImages((prev) => {
              const updated = new Map(prev);
              updated.delete(slotIndex);
              console.log('[UploadPage] Removed slot from uploading map', { slotIndex, remainingSlots: Array.from(updated.keys()) });
              return updated;
            });

            // Clean up preview URL
            const uploadingImg = newUploadingImages.get(slotIndex);
            if (uploadingImg) {
              URL.revokeObjectURL(uploadingImg.previewUrl);
            }

            return { success: true, image, slotIndex };
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
            console.error('[UploadPage] Upload failed for slot', { slotIndex, fileName: file.name, error: errorMessage });
            errors.push({ fileName: file.name, error: errorMessage, slotIndex });

            // Keep in uploading map on error so user can see which one failed
            // Only remove after some time or let user retry
            setTimeout(() => {
              setUploadingImages((prev) => {
                const updated = new Map(prev);
                updated.delete(slotIndex);
                console.log('[UploadPage] Removed failed upload slot after timeout', { slotIndex });
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
      >
        {layout && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">
              {uploadedImages.length} / {uploadedImages.length + uploadingImages.size} fotos subidas
            </span>
            <span className="ml-2">
              Se requiere un mínimo de {requiredCount}
            </span>
          </div>
        )}
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
                  <h2 className="text-5xl mb-6">Subir imágenes</h2>
                  <p className="text-muted-foreground">
                    Selecciona <strong>{requiredCount} imágenes</strong> para empezar.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Puedes cambiarlas más adelante
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
                  className="bg-gray-800 hover:bg-gray-900 text-white"
                >
                  Seleccionar imágenes
                </Button>
              </div>
            );
          }

          // Display up to maxImages (20) images
          const imagesToShow = uploadedImages.slice(0, maxImages);

          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-4xl font">Subir imágenes</h2>
                <p className="text-muted-foreground mt-2">
                  Selecciona <strong>{requiredCount} imágenes</strong> para empezar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Puedes cambiarlas más adelante
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {/* Add More button placeholder at the beginning */}
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

                {/* Display images maintaining their positions */}
                {(() => {
                  const startIndex = 0; // Include cover in grid
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

                  // Find the maximum index we need to display
                  const maxUploadedIndex = uploadedImagesBySlot.size > 0
                    ? Math.max(...Array.from(uploadedImagesBySlot.keys()))
                    : -1;
                  const maxUploadingIndex = uploadingImages.size > 0
                    ? Math.max(...Array.from(uploadingImages.keys()))
                    : -1;
                  // Ensure we show all uploading images, even if they're beyond current uploaded count
                  const maxIndex = Math.max(maxUploadedIndex, maxUploadingIndex, -1);

                  console.log('[UploadPage] Rendering slots', {
                    startIndex,
                    maxUploadedIndex,
                    maxUploadingIndex,
                    maxIndex,
                    uploadedSlots: Array.from(uploadedImagesBySlot.keys()),
                    uploadingSlots: Array.from(uploadingImages.keys()),
                  });

                  // Create a set of all indices that should be displayed
                  const indicesToDisplay = new Set<number>();
                  uploadedImagesBySlot.forEach((_, index) => indicesToDisplay.add(index));
                  uploadingImages.forEach((_, index) => indicesToDisplay.add(index));

                  // Create array of all slots with their images in order
                  const sortedIndices = Array.from(indicesToDisplay).sort((a, b) => a - b);
                  sortedIndices.forEach((i) => {
                    if (i >= startIndex && i < startIndex + maxImages) {
                      const uploadedImg = uploadedImagesBySlot.get(i);
                      const uploadingImg = uploadingImages.get(i);

                      if (uploadedImg) {
                        slots.push({ type: 'uploaded', image: uploadedImg, index: i });
                      } else if (uploadingImg) {
                        slots.push({ type: 'uploading', uploadingImage: uploadingImg, index: i });
                      }
                    }
                  });

                  console.log('[UploadPage] Final slots array', {
                    slotCount: slots.length,
                    slots: slots.map(s => ({ type: s.type, index: s.index })),
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
                          <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                            <Loading size="sm" className="text-white border-blue-600" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  });
                })()}
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
