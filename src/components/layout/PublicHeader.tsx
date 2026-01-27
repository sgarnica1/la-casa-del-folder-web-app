import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isSafari } from '@/utils/browser';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react';
import { Palette, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useApiClient } from '@/hooks/useApiClient';

export function PublicHeader() {
  const location = useLocation();
  const isSafariBrowser = isSafari();
  const { isSignedIn, isLoaded } = useAuth();
  const [cartItemCount, setCartItemCount] = useState(0);
  useApiClient();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setCartItemCount(0);
      return;
    }

    const loadCartCount = async () => {
      try {
        const cart = await apiClient.cart.getCart();
        setCartItemCount(cart.items.length);
      } catch {
        setCartItemCount(0);
      }
    };

    loadCartCount();

    const interval = setInterval(loadCartCount, 30000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn]);

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/product/calendar" className="hover:opacity-80 transition-opacity">
              <img
                src="/assets/images/logo-casa-folder.svg"
                alt="La Casa Del Folder"
                className="h-8 md:h-10"
              />
            </Link>
            {/* <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/product/calendar"
                className={`text-sm font-medium transition-colors ${isActive('/product/calendar')
                  ? 'text-primary'
                  : 'text-foreground/70 hover:text-primary'
                  }`}
              >
                Inicio
              </Link>
            </nav> */}
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton
                mode={isSafariBrowser ? "redirect" : "modal"}
                {...(isSafariBrowser
                  ? { redirectUrl: window.location.href }
                  : {}
                )}
              >
                <Button variant="default" size="sm">
                  Iniciar Sesión
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-1">
                <Link
                  to="/cart"
                  className={`p-2 rounded-md transition-colors relative ${isActive('/cart')
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-primary/10 hover:text-primary'
                    }`}
                  title="Carrito"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/account/my-designs"
                  className={`p-2 rounded-md transition-colors ${isActive('/account/my-designs')
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-primary/10 hover:text-primary'
                    }`}
                  title="Mis Diseños"
                >
                  <Palette className="h-5 w-5" />
                </Link>
                <Link
                  to="/account/order/history"
                  className={`p-2 mr-2 rounded-md transition-colors ${isActive('/account/order')
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/70 hover:bg-primary/10 hover:text-primary'
                    }`}
                  title="Mis Pedidos"
                >
                  <ShoppingBag className="h-5 w-5" />
                </Link>
                <UserButton afterSignOutUrl="/product/calendar" />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
