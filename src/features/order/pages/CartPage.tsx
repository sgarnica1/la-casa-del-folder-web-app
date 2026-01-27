import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton, Input } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { CartWithItems, CartItem } from '@/types/cart';
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
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isCheckout, setIsCheckout] = useState(false);
  const toast = useToast();
  useApiClient();

  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartData = await apiClient.cart.getCart();
        setCart(cartData);

        const uniqueDraftIds = [...new Set(cartData.items.map(item => item.draftId))];

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
        setIsLoading(false);
      }
    };

    loadCart();
  }, [toast]);

  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    setIsUpdating((prev) => ({ ...prev, [item.id]: true }));
    try {
      await apiClient.cart.updateCartItemQuantity(item.id, newQuantity);
      const updatedCart = await apiClient.cart.getCart();
      setCart(updatedCart);
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
      const updatedCart = await apiClient.cart.getCart();
      setCart(updatedCart);
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

    setIsCheckout(true);
    try {
      const order = await apiClient.cart.checkoutCart();
      // checkoutCart returns { id, draftId, state, createdAt }
      navigate(`/payment?orderId=${order.id}`);
    } catch (err) {
      toast.error(err);
      setIsCheckout(false);
    }
  };

  if (isLoading) {
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
                <h1 className="text-4xl font-bold">Carrito</h1>
                <p className="text-muted-foreground text-lg">
                  Tu carrito está vacío
                </p>
                <p className="text-muted-foreground text-sm max-w-md">
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Carrito</h1>
            <p className="text-muted-foreground mt-2">
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
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {draft?.title || 'Sin título'}
                        </h3>
                        <p className="text-sm font-medium mt-1">
                          {productName}
                        </p>
                        {productDescription && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {productDescription}
                          </p>
                        )}
                        {item.selectedOptionsSnapshot && item.selectedOptionsSnapshot.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.selectedOptionsSnapshot.map((option, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
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
                        <div className="mt-4 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={isUpdatingItem || !canDecrease}
                            >
                              <Minus className="h-4 w-4" />
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
                              className="w-16 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                              disabled={isUpdatingItem}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              disabled={isUpdatingItem}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item)}
                            disabled={isUpdatingItem}
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Precio unitario</p>
                        <p className="font-medium">{formatPrice(item.unitPrice)}</p>
                        <p className="text-sm text-muted-foreground mt-2">Subtotal</p>
                        <p className="text-lg font-bold">{formatPrice(itemTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-semibold">{formatPrice(cart.total)} <span className="text-muted-foreground text-sm">MXN</span></p>
                </div>
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  disabled={isCheckout || cart.items.length === 0}
                >
                  {isCheckout ? 'Procesando...' : 'Confirmar pedido'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
