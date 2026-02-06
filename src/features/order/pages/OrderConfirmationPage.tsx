import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, ErrorDisplay } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useCart } from '@/contexts/CartContext';
import { useApiClient } from '@/hooks/useApiClient';
import type { Draft } from '@/types';
import type { Product } from '@/types/product';

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export function OrderConfirmationPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const toast = useToast();
  const { refreshCart } = useCart();
  useApiClient();

  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      try {
        const draftData = await apiClient.drafts.getDraft(draftId);
        setDraft(draftData);

        // Fetch product data
        try {
          const productData = await apiClient.products.getProduct(draftData.productId);
          setProduct(productData);
        } catch (err) {
          console.error('Failed to fetch product:', err);
          // Fallback to default product info if API fails
          setProduct({
            id: draftData.productId,
            name: 'Calendario Personalizado',
            description: 'Calendario personalizado con tus fotos favoritas',
            basePrice: 500,
            currency: 'MXN',
          });
        }

        try {
          const cart = await apiClient.cart.getCart();
          const inCart = cart.items.some(item => item.draftId === draftId);
          setIsInCart(inCart);
        } catch {
          setIsInCart(false);
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

    loadDraft();
  }, [draftId, toast]);

  const handleBack = () => {
    if (draftId) {
      navigate(`/draft/${draftId}/edit`);
    }
  };

  const handleAddToCart = async () => {
    if (!draftId) return;

    setIsAddingToCart(true);

    try {
      await apiClient.cart.addCartItem(draftId);
      const updatedDraft = await apiClient.drafts.getDraft(draftId);
      setDraft(updatedDraft);
      setIsInCart(true);
      await refreshCart();
      toast.success('Agregado al carrito (diseño bloqueado)');
      navigate('/cart');
    } catch (err) {
      toast.error(err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleViewCart = () => {
    navigate('/cart');
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

  if (!draft || error) {
    return (
      <>
        <DraftEditorHeader onBack={handleBack} />
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
          onGoBack={handleBack}
          onGoHome={() => navigate('/')}
        />
      </>
    );
  }

  const isEditing = draft.status === 'draft';
  const isLocked = draft.status === 'locked';
  const isOrdered = draft.status === 'ordered';
  const canAddToCart = (isEditing || isLocked) && !isInCart && !isOrdered;

  const getContinueAction = () => {
    if (isInCart) return handleViewCart;
    return undefined;
  };

  const getContinueLabel = () => {
    if (isInCart) return 'Ver Carrito';
    return undefined;
  };

  const isContinueDisabled = isAddingToCart || isOrdered;

  return (
    <>
      <DraftEditorHeader
        onBack={handleBack}
        onContinue={getContinueAction()}
        continueLabel={getContinueLabel()}
        continueDisabled={isContinueDisabled}
        backDisabled={isContinueDisabled}
      />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-semibold">Detalles del Pedido</h2>
            <p className="text-sm text-muted-foreground">
              {isInCart
                ? 'Este artículo ya está en tu carrito'
                : isOrdered
                  ? 'Este diseño ya ha sido ordenado'
                  : 'Verifica la configuración antes de continuar'}
            </p>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="space-y-3 pb-4">
              <div>
                <CardTitle className="text-2xl font-semibold">{product?.name || 'Cargando...'}</CardTitle>
                <CardDescription className="mt-2 text-base text-muted-foreground">
                  {product?.description || 'Cargando...'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="border-t pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Precio final</p>
                  <p className="text-3xl font-semibold tracking-tight">
                    {product ? formatPrice(Number(product.basePrice)) : 'Error al cargar el precio'} <span className="text-muted-foreground text-sm">MXN</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    No se realizará ningún cargo hasta que confirmes el pago
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canAddToCart && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-4 px-6 rounded-md transition-colors text-base shadow-sm"
              >
                {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                Podrás revisar tu carrito antes de pagar
              </p>
            </div>
          )}

          {isInCart && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-center text-sm text-muted-foreground">
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
