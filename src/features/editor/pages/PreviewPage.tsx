import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import type { Draft, Layout } from '@/types';

export function PreviewPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) return;

    const loadData = async () => {
      try {
        const [draftData, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);
        setDraft(draftData);
        setLayout(layoutData);

        if (draftData.status === 'locked' || draftData.status === 'ordered') {
          navigate(`/draft/${draftId}/confirm`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [draftId, navigate]);

  const handleLockDraft = async () => {
    if (!draftId) return;

    setIsLocking(true);
    setError(null);

    try {
      const lockedDraft = await apiClient.lockDraft(draftId);
      setDraft(lockedDraft);
      navigate(`/draft/${draftId}/confirm`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock draft');
    } finally {
      setIsLocking(false);
    }
  };

  const handleBackToEditor = () => {
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

  if (!draft || !layout) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Error: No se pudo cargar el borrador</p>
      </div>
    );
  }

  const getImageForSlot = (slotId: string) => {
    const item = draft.layoutItems.find((li) => li.slotId === slotId);
    if (!item?.imageId) return null;
    return uploadedImages.find((img) => img.id === item.imageId) || null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Vista Previa</h2>
          <p className="text-muted-foreground mt-2">
            Revisa tu producto antes de bloquearlo
          </p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Vista Previa del Calendario</CardTitle>
            <CardDescription>
              Esta es la vista exacta que se utilizará para la orden
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {layout.slots.map((slot) => {
                const image = getImageForSlot(slot.id);
                return (
                  <div key={slot.id} className="space-y-2">
                    <div className="text-sm font-medium">{slot.name}</div>
                    {image ? (
                      <img
                        src={image.url}
                        alt={slot.name}
                        className="w-full h-32 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-md border flex items-center justify-center text-muted-foreground text-sm">
                        Sin imagen
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleBackToEditor} disabled={isLocking}>
            Volver al Editor
          </Button>
          <Button onClick={handleLockDraft} disabled={isLocking} size="lg">
            {isLocking ? 'Guardando...' : 'Guardar Diseño'}
          </Button>
        </div>
      </div>
    </div>
  );
}
