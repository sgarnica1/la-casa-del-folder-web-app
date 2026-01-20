import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { Draft } from '@/types';

export function OrderConfirmationPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      try {
        const draftData = await apiClient.getDraft(draftId);
        setDraft(draftData);
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
      navigate(`/draft/${draftId}/edit`);
    }
  };

  const handleAddToCart = async () => {
    if (!draftId) return;

    setIsCreatingOrder(true);

    try {
      // Lock the draft (add to cart)
      await apiClient.lockDraft(draftId);
      const lockedDraft = await apiClient.getDraft(draftId);
      setDraft(lockedDraft);

      // Navigate to cart with draftId
      navigate(`/cart?draftId=${draftId}`);
      toast.success('Agregado al carrito');
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

  const isInCart = draft.status === 'locked' || draft.status === 'ordered';

  return (
    <>
      <DraftEditorHeader
        onBack={handleBack}
        onContinue={!isInCart ? handleAddToCart : undefined}
        continueLabel={isCreatingOrder ? 'Agregando...' : 'Agregar al Carrito'}
        continueDisabled={isCreatingOrder || isInCart}
        backDisabled={isCreatingOrder}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-4xl font-bold">Detalles del Pedido</h2>
            <p className="text-muted-foreground mt-2">
              {isInCart
                ? 'Este artículo ya está en tu carrito'
                : 'Revisa los detalles antes de agregar al carrito'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalles del Pedido</CardTitle>
              <CardDescription>
                {isInCart ? 'Información de tu pedido' : 'Revisa los detalles antes de agregar al carrito'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-medium">Calendario Personalizado</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium">
                  {draft.status === 'locked' ? 'En carrito' : 'Borrador'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Precio</p>
                <p className="text-2xl font-bold">$500.00</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {isInCart && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Este artículo ya está en tu carrito. Puedes continuar al pago desde la página del carrito.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
