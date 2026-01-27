import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignInButton } from '@clerk/clerk-react';
import { Button, Loading } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import { isSafari } from '@/utils/browser';

const HARDCODED_PRODUCT_ID = 'calendar';
const HARDCODED_TEMPLATE_ID = 'calendar-template';
const AUTO_CREATE_KEY = 'product_auto_create_attempted';
const PENDING_DRAFT_CREATE_KEY = 'product_pending_draft_create';

export function ProductDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { waitForToken, isSignedIn, isLoaded } = useWaitForToken();
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const hasAttemptedAutoCreate = useRef(false);
  const prevIsSignedIn = useRef<boolean | undefined>(undefined);
  const isSafariBrowser = isSafari();

  const createDraftAndRedirect = useCallback(async () => {
    if (isLoading) return;

    if (!isLoaded) {
      toast.warning('Cargando sesión...');
      return;
    }

    if (!isSignedIn) {
      toast.warning('Por favor, inicia sesión primero');
      return;
    }

    setIsLoading(true);

    try {
      // Wait for token to be available before creating draft
      console.log('[ProductDetailPage] Waiting for token before creating draft...');
      const token = await waitForToken();

      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación. Por favor, intenta nuevamente.');
      }

      console.log('[ProductDetailPage] Token available, creating draft...');
      const draft = await apiClient.drafts.createDraft(HARDCODED_PRODUCT_ID, HARDCODED_TEMPLATE_ID);
      sessionStorage.setItem(AUTO_CREATE_KEY, 'true');
      sessionStorage.removeItem(PENDING_DRAFT_CREATE_KEY);
      toast.success('Borrador creado exitosamente');
      navigate(`/draft/${draft.id}/upload`, { replace: true });
    } catch (err) {
      console.error('[ProductDetailPage] Error creating draft:', err);
      toast.error(err);
      setIsLoading(false);
    }
  }, [navigate, toast, isLoading, isLoaded, isSignedIn, waitForToken]);

  useEffect(() => {
    if (!isLoaded || isLoading || location.pathname !== '/product/calendar') {
      return;
    }

    let hasAttempted = sessionStorage.getItem(AUTO_CREATE_KEY) === 'true';
    const pendingCreate = sessionStorage.getItem(PENDING_DRAFT_CREATE_KEY) === 'true';

    if (pendingCreate && !hasAttemptedAutoCreate.current) {
      if (hasAttempted) {
        sessionStorage.removeItem(AUTO_CREATE_KEY);
        hasAttempted = false;
      }
      hasAttemptedAutoCreate.current = false;
    }

    prevIsSignedIn.current = isSignedIn;

    if (
      isSignedIn === true &&
      pendingCreate === true &&
      !hasAttemptedAutoCreate.current &&
      !hasAttempted &&
      !isLoading
    ) {
      hasAttemptedAutoCreate.current = true;
      createDraftAndRedirect();
    }
  }, [location.pathname, isLoaded, isSignedIn, isLoading, createDraftAndRedirect]);

  const handlePersonalizeClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isLoaded || isSignedIn) {
      return;
    }
    sessionStorage.setItem(PENDING_DRAFT_CREATE_KEY, 'true');
  };

  const handlePersonalize = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isLoaded || !isSignedIn || isLoading) {
      return;
    }

    await createDraftAndRedirect();
  };

  const [selectedVariant, setSelectedVariant] = useState<'mediano' | 'grande'>('mediano');
  const [selectedImage, setSelectedImage] = useState(0);

  const variants = {
    mediano: { name: 'Mediano', price: 500.00 },
    grande: { name: 'Grande', price: 550.00 },
  };

  const productImages = [
    '/assets/images/calendar-mock-2.jpg',
    '/assets/images/calendar-mock-3.jpg',
    '/assets/images/calendar-mock-4.jpg',
    '/assets/images/calendar-mock-4.jpg',
  ];

  const specifications = [
    'Lorem ipsum dolor sit amet',
    '50cm x 40cm',
    'Lorem ipsum',
    'Lorem ipsum dolor sit amet',
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={productImages[selectedImage]}
              alt={`Product image ${selectedImage + 1}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnail Images */}
          <div className="grid grid-cols-3 gap-4">
            {productImages.slice(0, 3).map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square bg-gray-200 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-gray-800' : 'border-transparent hover:border-gray-300'
                  }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Product Details */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-3xl md:text-4xl mb-3">
              Calendario en horizontal
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Este fotocalendario a doble página, ideal para familias, tiene mucho espacio para tus fechas importantes.
            </p>
          </div>

          {/* Size Variants */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedVariant('mediano')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${selectedVariant === 'mediano'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
              >
                Mediano
              </button>
              <button
                onClick={() => setSelectedVariant('grande')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${selectedVariant === 'grande'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
              >
                Grande
              </button>
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="text-2xl font-bold text-primary">
              ${variants[selectedVariant].price.toFixed(2)} MXN
            </p>
          </div>

          {/* Personalize Button */}
          <div>
            {isLoaded && !isSignedIn ? (
              <SignInButton
                mode={isSafariBrowser ? "redirect" : "modal"}
                {...(isSafariBrowser
                  ? { redirectUrl: window.location.href }
                  : { fallbackRedirectUrl: window.location.href }
                )}
              >
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handlePersonalizeClick}
                >
                  Personalizar
                </Button>
              </SignInButton>
            ) : (
              <Button
                type="button"
                onClick={handlePersonalize}
                disabled={isLoading || !isLoaded}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loading size="sm" />
                    Creando...
                  </span>
                ) : (
                  'Personalizar'
                )}
              </Button>
            )}
          </div>

          {/* Specifications */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Especificaciones</h2>
            <ul className="space-y-2">
              {specifications.map((spec, index) => (
                <li key={index} className="text-muted-foreground flex items-start">
                  <span className="mr-2">•</span>
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
