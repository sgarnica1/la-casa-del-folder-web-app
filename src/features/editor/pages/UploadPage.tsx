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
  const [error, setError] = useState<string | null>(null);

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

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map((file) => apiClient.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      const newImages: UploadedImage[] = results.map((r) => ({ id: r.id, url: r.url }));
      addImages(newImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
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

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
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
