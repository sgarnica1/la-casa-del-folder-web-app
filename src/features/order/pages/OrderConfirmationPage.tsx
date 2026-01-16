import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import type { Draft } from '@/types';

export function OrderConfirmationPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [draftId]);

  const handleConfirmOrder = async () => {
    if (!draftId) return;

    setIsCreatingOrder(true);
    setError(null);

    try {
      const result = await apiClient.createOrder(draftId);
      setOrderId(result.orderId);
      localStorage.setItem(`order-${draftId}`, result.orderId);

      const updatedDraft = await apiClient.getDraft(draftId);
      setDraft(updatedDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Error: No se pudo cargar el borrador</p>
      </div>
    );
  }

  if (draft.status !== 'locked' && draft.status !== 'ordered') {
    return (
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
    );
  }

  const hasOrder = orderId || draft.status === 'ordered';

  return (
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

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

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

        {!hasOrder && (
          <div className="flex justify-end">
            <Button
              onClick={handleConfirmOrder}
              disabled={isCreatingOrder}
              size="lg"
              className="w-full md:w-auto"
            >
              {isCreatingOrder ? 'Creando Pedido...' : 'Confirmar Pedido'}
            </Button>
          </div>
        )}

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
  );
}
