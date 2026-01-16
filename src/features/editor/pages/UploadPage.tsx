import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import type { Layout, UploadedImage } from '@/types';

export function UploadPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages, addImages, removeImage } = useUploadedImages();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Array<{ fileName: string; error: string }>>([]);

  useEffect(() => {
    if (!draftId) return;

    const loadData = async () => {
      try {
        const [, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);
        setLayout(layoutData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [draftId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setIsUploading(true);
    setError(null);
    setUploadErrors([]);
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

      if (errors.length > 0) {
        setUploadErrors(errors);
        if (successfulImages.length === 0) {
          setError(`Failed to upload all ${fileArray.length} image${fileArray.length !== 1 ? 's' : ''}`);
        } else {
          setError(`${errors.length} of ${fileArray.length} image${fileArray.length !== 1 ? 's' : ''} failed to upload`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      event.target.value = '';
    }
  };

  const handleContinue = () => {
    if (draftId) {
      navigate(`/draft/${draftId}/edit`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando...</p>
      </div>
    );
  }

  const requiredCount = layout?.slots.filter((s) => s.required).length || 0;
  const hasMinimumImages = uploadedImages.length >= requiredCount;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Subir Imágenes</h2>
          <p className="text-muted-foreground mt-2">
            Sube al menos {requiredCount} imagen{requiredCount !== 1 ? 'es' : ''} para continuar
          </p>
        </div>

        {isUploading && uploadProgress && (
          <div className="text-sm bg-primary/10 text-primary p-3 rounded-md">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              <span>Subiendo imágenes... {uploadProgress.current} of {uploadProgress.total}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        {uploadErrors.length > 0 && (
          <div className="text-sm bg-destructive/10 p-3 rounded-md space-y-1">
            <p className="font-semibold text-destructive">Failed uploads:</p>
            <ul className="list-disc list-inside space-y-1">
              {uploadErrors.map((err, idx) => (
                <li key={idx} className="text-destructive/80">
                  <span className="font-medium">{err.fileName}:</span> {err.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Imágenes Subidas</CardTitle>
            <CardDescription>
              {uploadedImages.length} de {requiredCount} mínimo requeridas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {uploadedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt="Uploaded"
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedImages.length < requiredCount && (
              <div className="text-sm text-muted-foreground">
                Sube {requiredCount - uploadedImages.length} imagen{requiredCount - uploadedImages.length !== 1 ? 'es' : ''} más
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleContinue}
            disabled={!hasMinimumImages || isUploading}
            size="lg"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
