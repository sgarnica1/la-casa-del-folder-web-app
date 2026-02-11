import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton, Input } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import { useCart } from '@/contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { CartItem } from '@/types/cart';
import type { Draft } from '@/types';

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isLoading, refreshCart } = useCart();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const toast = useToast();
  useApiClient();

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      setIsLoadingDrafts(false);
      return;
    }

    const loadDrafts = async () => {
      try {
        const uniqueDraftIds = [...new Set(cart.items.map(item => item.draftId))];

        const draftResults = await Promise.all(
          uniqueDraftIds.map(async (draftId) => {
            try {
              const draft = await apiClient.drafts.getDraft(draftId);
              return { [draftId]: draft };
            } catch {
              return {};
            }
          })
        );

        const draftsMap = draftResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setDrafts(draftsMap);
      } catch (err) {
        toast.error(err);
      } finally {
        setIsLoadingDrafts(false);
      }
    };

    loadDrafts();
  }, [cart, toast]);

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    setIsUpdating((prev) => ({ ...prev, [item.id]: true }));
    try {
      await apiClient.cart.updateCartItemQuantity(item.id, newQuantity);
      await refreshCart();
      toast.success('Cantidad actualizada');
    } catch (err) {
      toast.error(err);
    } finally {
      setIsUpdating((prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }));
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    setIsUpdating((prev) => ({ ...prev, [item.id]: true }));
    try {
      await apiClient.cart.removeCartItem(item.id);
      await refreshCart();
      const updatedDrafts = { ...drafts };
      delete updatedDrafts[item.draftId];
      setDrafts(updatedDrafts);
      toast.success('Item eliminado del carrito');
    } catch (err) {
      toast.error(err);
    } finally {
      setIsUpdating((prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }));
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    navigate('/checkout');
  };

  if (isLoading || isLoadingDrafts) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-muted p-6">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-gray-900">Carrito</h1>
                <p className="text-gray-600 text-base">
                  Tu carrito está vacío
                </p>
                <p className="text-gray-500 text-sm max-w-md">
                  Añade artículos a tu carrito para continuar con tu pedido
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/product/calendar')}
              size="lg"
              className="mt-4"
            >
              Ver productos
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-medium text-xs">
                1
              </div>
              <span className="text-gray-900 font-medium">Diseño</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-medium text-xs">
                2
              </div>
              <span className="text-gray-900 font-medium">Carrito</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-medium text-xs">
                3
              </div>
              <span className="text-gray-500">Pago</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Carrito</h1>
            <p className="text-gray-600">
              Revisa tu pedido antes de continuar
            </p>
          </div>

          <div className="space-y-4">
            {cart.items.map((item) => {
              const draft = drafts[item.draftId];
              const itemTotal = item.unitPrice * item.quantity;
              const isUpdatingItem = isUpdating[item.id];
              const canDecrease = item.quantity > 1;

              const product = cart.products?.[item.productId];
              const productName = product?.name || 'Producto';
              const productDescription = product?.description || null;

              return (
                <Card
                  key={item.id}
                  className="border-gray-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {draft?.title || 'Sin título'}
                          </h3>
                          <p className="text-sm font-medium text-gray-600">
                            {productName}
                          </p>
                          {productDescription && (
                            <p className="text-xs text-gray-500 mt-1">
                              {productDescription}
                            </p>
                          )}
                        </div>
                        {item.selectedOptionsSnapshot && item.selectedOptionsSnapshot.length > 0 && (
                          <div className="space-y-1">
                            {item.selectedOptionsSnapshot.map((option, idx) => (
                              <p key={idx} className="text-xs text-gray-500">
                                {option.optionTypeName}: {option.optionValueName}
                                {option.priceModifier !== null && option.priceModifier !== 0 && (
                                  <span className="ml-1">
                                    ({option.priceModifier > 0 ? '+' : ''}{formatPrice(option.priceModifier)})
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={isUpdatingItem || !canDecrease}
                              className="h-8 w-8 rounded-full hover:bg-gray-200"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                if (val >= 1) {
                                  handleUpdateQuantity(item, val);
                                }
                              }}
                              className="w-12 h-8 text-center text-sm border-0 bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] focus-visible:ring-0"
                              disabled={isUpdatingItem}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              disabled={isUpdatingItem}
                              className="h-8 w-8 rounded-full hover:bg-gray-200"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item)}
                            disabled={isUpdatingItem}
                            title="Eliminar del carrito"
                            className="h-8 w-8 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-left sm:text-right space-y-1 sm:min-w-[140px]">
                        <p className="text-xs text-gray-500">Precio unitario</p>
                        <p className="text-sm font-medium text-gray-700">{formatPrice(item.unitPrice)}</p>
                        <p className="text-xs text-gray-500 mt-3">Subtotal</p>
                        <p className="text-base font-semibold text-gray-900">{formatPrice(itemTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border-gray-200/60 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:justify-between md:items-center gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(cart.total)}
                    <span className="text-sm font-normal text-gray-500 ml-2">MXN</span>
                  </p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={cart.items.length === 0}
                  className="rounded-xl h-12 px-8 text-base font-medium bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5 w-full md:w-auto"
                >
                  Continuar al pago
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
