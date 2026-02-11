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
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-gray-900">Detalles del Pedido</h2>
            <p className="text-base text-gray-600">
              {isInCart
                ? 'Este artículo ya está en tu carrito'
                : isOrdered
                  ? 'Este diseño ya ha sido ordenado'
                  : 'Verifica la configuración antes de continuar'}
            </p>
          </div>

          <Card className="border border-gray-200/60 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <CardHeader className="space-y-4 pb-6">
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900">{product?.name || 'Cargando...'}</CardTitle>
                <CardDescription className="mt-3 text-base text-gray-600">
                  {product?.description || 'Cargando...'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Precio final</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {product ? formatPrice(Number(product.basePrice)) : 'Error al cargar el precio'}
                    <span className="text-lg font-normal text-gray-500 ml-1">MXN</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-3">
                    No se realizará ningún cargo hasta que confirmes el pago
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {canAddToCart && (
            <div className="space-y-4 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-180 text-base shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
              </button>
              <p className="text-xs text-center text-gray-500">
                Podrás revisar tu carrito antes de pagar
              </p>
            </div>
          )}

          {isInCart && (
            <Card className="border border-gray-200/60 rounded-2xl bg-gray-50 shadow-sm">
              <CardContent className="pt-6 pb-6">
                <p className="text-center text-sm text-gray-600">
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
