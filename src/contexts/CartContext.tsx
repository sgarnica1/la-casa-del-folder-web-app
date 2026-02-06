import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '@/services/api-client';
import { useApiClient } from '@/hooks/useApiClient';
import type { CartWithItems } from '@/types/cart';

interface CartContextType {
  cart: CartWithItems | null;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [cart, setCart] = useState<CartWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useApiClient();

  const refreshCart = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setCart(null);
      setIsLoading(false);
      return;
    }

    try {
      const cartData = await apiClient.cart.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Failed to load cart:', error);
      setCart(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const cartItemCount = cart?.items.length || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        refreshCart,
        cartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
