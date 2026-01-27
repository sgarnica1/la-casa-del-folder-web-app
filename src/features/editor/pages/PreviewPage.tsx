import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ErrorDisplay,
} from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import type { Draft, Layout } from '@/types';

export function PreviewPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!draftId) return;

    const loadData = async () => {
      try {
        const [draftData, layoutData] = await Promise.all([
          apiClient.drafts.getDraft(draftId),
          apiClient.layouts.getLayout('calendar-template'),
        ]);
        setDraft(draftData);
        setLayout(layoutData);

        if (draftData.status === 'locked' || draftData.status === 'ordered') {
          navigate(`/draft/${draftId}/confirm`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'No se pudo cargar el borrador';
        const errorStatus = err instanceof Error && 'status' in err ? (err as { status: number }).status : undefined;
        setError({ message: errorMessage, status: errorStatus });
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [draftId, navigate, toast]);

  const handleLockDraft = async () => {
    if (!draftId) return;

    setShowLockDialog(false);
    setIsLocking(true);

    try {
      const lockedDraft = await apiClient.drafts.lockDraft(draftId);
      setDraft(lockedDraft);
      toast.success('Diseño bloqueado — listo para ordenar');
      navigate(`/draft/${draftId}/confirm`);
    } catch (err) {
      toast.error(err);
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
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (!draft || !layout || error) {
    return (
      <>
        <DraftEditorHeader />
        <ErrorDisplay
          message={error?.message || 'No se pudo cargar el borrador'}
          status={error?.status}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            if (draftId) {
              window.location.reload();
            }
          }}
          onGoBack={handleBackToEditor}
          onGoHome={() => navigate('/')}
        />
      </>
    );
  }

  return (
    <>
      <DraftEditorHeader
        onBack={handleBackToEditor}
        onContinue={() => setShowLockDialog(true)}
        continueLabel={isLocking ? 'Guardando...' : 'Bloquear Diseño'}
        continueDisabled={isLocking}
        backDisabled={isLocking}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Vista Previa</h2>
            <p className="text-muted-foreground mt-2">
              Revisa tu producto antes de bloquearlo
            </p>
          </div>

          <CalendarEditor
            layout={layout}
            layoutItems={draft.layoutItems}
            images={uploadedImages}
            year={2026}
            title={draft.title || 'Agregar título'}
            isLocked={true}
            layoutMode="grid"
          />
        </div>
      </div>

      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Bloqueo</DialogTitle>
            <DialogDescription>
              Una vez bloqueado, no podrás editar este diseño. ¿Estás seguro?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='mt-6'>
            <Button variant="outline" onClick={() => setShowLockDialog(false)} disabled={isLocking}>
              Cancelar
            </Button>
            <Button onClick={handleLockDraft} disabled={isLocking} size="lg">
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
