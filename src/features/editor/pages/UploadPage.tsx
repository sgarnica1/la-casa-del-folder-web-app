import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Loading, Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import type { Layout, UploadedImage } from '@/types';

export function UploadPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
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
    setUploadProgress({ current: 0, total: fileArray.length });

    const successfulImages: UploadedImage[] = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    try {
      const uploadPromises = fileArray.map(async (file) => {
        try {
          const result = await apiClient.uploadImage(file);
          const image: UploadedImage = { id: result.id, url: result.url };
          successfulImages.push(image);
          addImages([image]);
          setUploadProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
          return { success: true, image };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
          errors.push({ fileName: file.name, error: errorMessage });
          setUploadProgress((prev) => prev ? { ...prev, current: prev.current + 1 } : null);
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
      setUploadProgress(null);
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
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
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
        continueLabel={isUploading ? 'Subiendo...' : 'Continuar'}
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

          {isUploading && uploadProgress && (
            <div className="text-sm bg-primary/10 text-primary p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Loading size="sm" />
                <span>
                  Subiendo imágenes... {uploadProgress.current} de {uploadProgress.total}
                </span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Subir imágenes</CardTitle>
              <CardDescription>
                Selecciona {requiredCount} imágenes para empezar
              </CardDescription>
              <CardDescription className="text-xs">
                Puedes cambiarlas más adelante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                  id="image-upload-input"
                />
                <Button
                  onClick={() => {
                    const input = document.getElementById('image-upload-input') as HTMLInputElement;
                    input?.click();
                  }}
                  disabled={isUploading}
                >
                  Seleccionar imágenes
                </Button>
              </div>

              {layout && (
                <div className="space-y-6">
                  {(() => {
                    const sortedSlots = [...layout.slots].sort((a, b) => {
                      const aMatch = a.name.match(/mes\s*(\d+)/i) || a.name.match(/month\s*(\d+)/i);
                      const bMatch = b.name.match(/mes\s*(\d+)/i) || b.name.match(/month\s*(\d+)/i);

                      if (a.name.toLowerCase().includes('portada') || a.name.toLowerCase().includes('cover')) return -1;
                      if (b.name.toLowerCase().includes('portada') || b.name.toLowerCase().includes('cover')) return 1;

                      if (aMatch && bMatch) {
                        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
                      }
                      return a.name.localeCompare(b.name);
                    });

                    const coverSlot = sortedSlots.find(s =>
                      s.name.toLowerCase().includes('portada') || s.name.toLowerCase().includes('cover')
                    );
                    const monthSlots = sortedSlots.filter(s =>
                      !s.name.toLowerCase().includes('portada') &&
                      !s.name.toLowerCase().includes('cover')
                    );

                    const unusedImages = [...uploadedImages];

                    return (
                      <>
                        {coverSlot && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Portada
                            </div>
                            <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30">
                              {unusedImages.length > 0 ? (
                                <img
                                  src={unusedImages[0].url}
                                  alt="Cover"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                  Agregar foto para Portada
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                          {monthSlots.map((slot, index) => {
                            const imageIndex = coverSlot ? index + 1 : index;
                            const image = unusedImages[imageIndex] || null;

                            return (
                              <div key={slot.id} className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground text-center">
                                  {slot.name}
                                </div>
                                <div className="relative w-full aspect-square rounded-md overflow-hidden border-2 border-dashed border-border bg-muted/30 shadow-sm">
                                  {image ? (
                                    <img
                                      src={image.url}
                                      alt={slot.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2">
                                      Agregar foto para {slot.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
