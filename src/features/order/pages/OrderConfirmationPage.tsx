import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { Draft } from '@/types';

export function OrderConfirmationPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      try {
        const draftData = await apiClient.getDraft(draftId);
        setDraft(draftData);

        if (draftData.status === 'ordered') {
          const existingOrderId = localStorage.getItem(`order-${draftId}`);
          if (existingOrderId) {
            setOrderId(existingOrderId);
          }
        }
      } catch (err) {
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [draftId, toast]);

  const handleBack = () => {
    if (draftId) {
      navigate(`/draft/${draftId}/preview`);
    }
  };

  const handleConfirmOrder = async () => {
    if (!draftId) return;

    setIsCreatingOrder(true);

    try {
      const result = await apiClient.createOrder(draftId);
      setOrderId(result.orderId);
      localStorage.setItem(`order-${draftId}`, result.orderId);

      const updatedDraft = await apiClient.getDraft(draftId);
      setDraft(updatedDraft);
      toast.success('Pedido creado exitosamente');
    } catch (err) {
      toast.error(err);
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <DraftEditorHeader onBack={handleBack} />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
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

  if (!draft) {
    return (
      <>
        <DraftEditorHeader onBack={handleBack} />
        <div className="container mx-auto px-4 py-8">
          <p>Error: No se pudo cargar el borrador</p>
        </div>
      </>
    );
  }

  if (draft.status !== 'locked' && draft.status !== 'ordered') {
    return (
      <>
        <DraftEditorHeader onBack={handleBack} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                El borrador debe estar bloqueado antes de crear una orden.
              </p>
              <Button
                onClick={() => navigate(`/draft/${draftId}/preview`)}
                className="mt-4"
              >
                Ir a Vista Previa
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const hasOrder = orderId || draft.status === 'ordered';

  return (
    <>
      <DraftEditorHeader
        onBack={handleBack}
        onContinue={!hasOrder ? handleConfirmOrder : undefined}
        continueLabel={isCreatingOrder ? 'Creando Pedido...' : 'Confirmar Pedido'}
        continueDisabled={isCreatingOrder}
        backDisabled={isCreatingOrder}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-bold">
              {hasOrder ? '¡Pedido Confirmado!' : 'Confirmar Pedido'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {hasOrder
                ? 'Tu pedido ha sido procesado exitosamente'
                : 'Confirma tu pedido para continuar'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
              <CardDescription>
                {hasOrder ? 'Información de tu pedido' : 'Revisa los detalles antes de confirmar'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasOrder && orderId && (
                <div>
                  <p className="text-sm text-muted-foreground">ID de Pedido</p>
                  <p className="font-mono text-lg font-semibold">{orderId}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium">
                  {draft.status === 'locked' ? 'Bloqueado' : 'Ordenado'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {hasOrder && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Gracias por tu pedido. Te contactaremos pronto con más detalles.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
