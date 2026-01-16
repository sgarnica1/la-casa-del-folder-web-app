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
} from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import { CalendarPreview } from '@/components/product/CalendarPreview';
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
  const toast = useToast();

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
      const lockedDraft = await apiClient.lockDraft(draftId);
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

  if (!draft || !layout) {
    return (
      <>
        <DraftEditorHeader />
        <div className="container mx-auto px-4 py-8">
          <p>Error: No se pudo cargar el borrador</p>
        </div>
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

          <CalendarPreview
            layout={layout}
            layoutItems={draft.layoutItems}
            images={uploadedImages}
            isLocked={false}
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
