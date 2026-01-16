import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiClient } from '@/services/api-client';

const HARDCODED_PRODUCT_ID = 'calendar';
const HARDCODED_TEMPLATE_ID = 'calendar-template';
const AUTO_CREATE_KEY = 'product_auto_create_attempted';
const PENDING_DRAFT_CREATE_KEY = 'product_pending_draft_create';

export function ProductDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedAutoCreate = useRef(false);
  const prevIsSignedIn = useRef<boolean | undefined>(undefined);

  const createDraftAndRedirect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const draft = await apiClient.createDraft(HARDCODED_PRODUCT_ID, HARDCODED_TEMPLATE_ID);
      sessionStorage.setItem(AUTO_CREATE_KEY, 'true');
      sessionStorage.removeItem(PENDING_DRAFT_CREATE_KEY);
      navigate(`/draft/${draft.id}/upload`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isLoading) {
      return;
    }

    let hasAttempted = sessionStorage.getItem(AUTO_CREATE_KEY) === 'true';
    const pendingCreate = sessionStorage.getItem(PENDING_DRAFT_CREATE_KEY) === 'true';

    if (location.pathname === '/product/calendar' && pendingCreate && !hasAttemptedAutoCreate.current) {
      if (hasAttempted) {
        sessionStorage.removeItem(AUTO_CREATE_KEY);
        hasAttempted = false;
      }
      hasAttemptedAutoCreate.current = false;
    }

    prevIsSignedIn.current = isSignedIn;

    if (
      location.pathname === '/product/calendar' &&
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

  const handlePersonalizeClick = () => {
    if (!isLoaded || isSignedIn) {
      return;
    }
    sessionStorage.setItem(PENDING_DRAFT_CREATE_KEY, 'true');
  };

  const handlePersonalize = async () => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    await createDraftAndRedirect();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Calendario en Horizontal</h1>
          <p className="text-muted-foreground mt-2">
            Este fotocalendario a doble página, ideal para familias, tiene mucho espacio para tus fechas importantes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendario Mediano</CardTitle>
            <CardDescription>
              Calendario de pared con portada con y 12 meses. Personaliza cada mes con tus propias fotos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">$500.00</span>
              <span className="text-muted-foreground">MXN</span>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {isLoaded && !isSignedIn ? (
              <SignInButton mode="modal" fallbackRedirectUrl={window.location.href}>
                <Button size="lg" className="w-full" onClick={handlePersonalizeClick}>
                  Personalizar
                </Button>
              </SignInButton>
            ) : (
              <Button
                onClick={handlePersonalize}
                disabled={isLoading || !isLoaded}
                size="lg"
                className="w-full"
              >
                {isLoading ? 'Creando...' : 'Personalizar'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
