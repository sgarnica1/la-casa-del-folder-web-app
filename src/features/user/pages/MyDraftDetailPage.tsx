import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import type { Draft, Layout } from '@/types';

const STATE_LABELS: Record<string, string> = {
  editing: 'Draft',
  locked: 'Bloqueado',
  ordered: 'Ordenado',
};

const STATE_COLORS: Record<string, string> = {
  editing: 'bg-primary/10 text-primary border-primary/20',
  locked: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ordered: 'bg-green-100 text-green-800 border-green-200',
};

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATE_COLORS[state] || 'bg-muted text-muted-foreground border-border'}`}>
      {STATE_LABELS[state] || state}
    </span>
  );
}

export function MyDraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [draftData, layoutData] = await Promise.all([
          apiClient.getMyDraftById(id),
          apiClient.getLayout('calendar-template'),
        ]);

        setDraft(draftData);
        setLayout(layoutData);

        if (draftData.layoutItems) {
          const imageIds = draftData.layoutItems
            .map(item => item.imageId)
            .filter((id): id is string => !!id);

          if (imageIds.length > 0) {
            const images = await apiClient.getImagesByIds(imageIds);
            addImages(images);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403) {
            toast.error('No tienes acceso a este diseño');
            navigate('/account/my-designs', { replace: true });
          } else if (status === 404) {
            toast.error('Diseño no encontrado');
            navigate('/account/my-designs', { replace: true });
          } else {
            toast.error(err);
          }
        } else {
          toast.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, navigate, toast, addImages]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!draft || !layout) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Diseño no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLocked = draft.status === 'locked' || draft.status === 'ordered';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/account/my-designs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{draft.title || 'Sin título'}</h1>
            <StatusBadge state={draft.status === 'draft' ? 'editing' : draft.status} />
          </div>
          {!isLocked && (
            <Button onClick={() => navigate(`/draft/${id}/edit`)}>
              Editar diseño
            </Button>
          )}
        </div>
      </div>

      <CalendarEditor
        layout={layout}
        layoutItems={draft.layoutItems}
        images={uploadedImages}
        year={2026}
        title={draft.title || 'Sin título'}
        isLocked={isLocked}
        layoutMode="grid"
      />
    </div>
  );
}
