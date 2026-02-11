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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left Column - Product Images */}
        <div className="space-y-5">
          {/* Main Image */}
          <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] group">
            <img
              src={productImages[selectedImage]}
              alt={`Product image ${selectedImage + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            />
          </div>

          {/* Thumbnail Images */}
          <div className="grid grid-cols-3 gap-4">
            {productImages.slice(0, 3).map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                  selectedImage === index
                    ? 'border-gray-900 scale-105 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:scale-105'
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
        <div className="space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
              Calendario en horizontal
            </h1>
            <p className="text-gray-600 text-base leading-relaxed max-w-lg">
              Este fotocalendario a doble página, ideal para familias, tiene mucho espacio para tus fechas importantes.
            </p>
          </div>

          {/* Size Variants */}
          <div className="space-y-4">
            <div className="inline-flex gap-2 p-1 bg-gray-100 rounded-full">
              <button
                onClick={() => setSelectedVariant('mediano')}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-150 ${
                  selectedVariant === 'mediano'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-transparent text-gray-700 hover:text-gray-900'
                }`}
              >
                Mediano
              </button>
              <button
                onClick={() => setSelectedVariant('grande')}
                className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-150 ${
                  selectedVariant === 'grande'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-transparent text-gray-700 hover:text-gray-900'
                }`}
              >
                Grande
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="pt-2">
            <p className="text-3xl font-bold text-gray-900">
              ${variants[selectedVariant].price.toFixed(2)}
              <span className="text-lg font-normal text-gray-500 ml-1">MXN</span>
            </p>
          </div>

          {/* Personalize Button */}
          <div className="pt-2">
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
                  className="w-full h-14 rounded-2xl font-semibold text-base bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
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
                className="w-full h-14 rounded-2xl font-semibold text-base bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
          <div className="pt-8 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-5">Especificaciones</h2>
            <ul className="space-y-3">
              {specifications.map((spec, index) => (
                <li key={index} className="text-gray-600 flex items-start">
                  <span className="mr-3 mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="leading-relaxed">{spec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
