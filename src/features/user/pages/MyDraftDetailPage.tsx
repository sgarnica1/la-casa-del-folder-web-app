import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Lock } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useCart } from '@/contexts/CartContext';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import { useApiClient } from '@/hooks/useApiClient';
import type { Draft, Layout } from '@/types';

function useIsMdOrLarger() {
  const [isMdOrLarger, setIsMdOrLarger] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMdOrLarger(window.innerWidth >= 768);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isMdOrLarger;
}

const STATE_LABELS: Record<string, string> = {
  editing: 'Draft',
  locked: 'Bloqueado',
  ordered: 'Ordenado',
};

const STATE_COLORS: Record<string, string> = {
  editing: 'bg-blue-50 text-blue-700',
  locked: 'bg-amber-50 text-amber-700',
  ordered: 'bg-emerald-50 text-emerald-700',
};

function StatusBadge({ state }: { state: string }) {
  const Icon = state === 'locked' ? Lock : null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATE_COLORS[state] || 'bg-gray-50 text-gray-700'}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {STATE_LABELS[state] || state}
    </span>
  );
}

export function MyDraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { waitForToken, isLoaded, isSignedIn } = useWaitForToken();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInCart, setIsInCart] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const isMdOrLarger = useIsMdOrLarger();
  const toast = useToast();
  const { refreshCart } = useCart();
  useApiClient();

  useEffect(() => {
    if (!id) return;

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      const token = await waitForToken();
      if (!token) {
        console.warn('[MyDraftDetailPage] No token available, cannot load draft');
        setIsLoading(false);
        return;
      }

      try {
        const [draftData, layoutData] = await Promise.all([
          apiClient.drafts.getMyDraftById(id),
          apiClient.layouts.getLayout('calendar-template'),
        ]);

        setDraft(draftData);
        setLayout(layoutData);

        if (draftData.layoutItems) {
          const imageIds = draftData.layoutItems
            .map(item => item.imageId)
            .filter((id): id is string => !!id);

          if (imageIds.length > 0) {
            const images = await apiClient.assets.getImagesByIds(imageIds);
            addImages(images);
          }
        }

        if (draftData.status === 'locked') {
          try {
            const cart = await apiClient.cart.getCart();
            const inCart = cart.items.some(item => item.draftId === id);
            setIsInCart(inCart);
          } catch {
            setIsInCart(false);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403) {
            toast.error('No tienes acceso a este diseño');
            navigate('/account/my-designs', { replace: true });
          } else if (status === 404) {
            toast.error('Diseño no encontrado');
            navigate('/account/my-designs', { replace: true });
          } else if (status === 401) {
            console.warn('[MyDraftDetailPage] 401 Unauthorized - authentication may not be ready');
            toast.error('Error de autenticación. Por favor, recarga la página.');
          } else {
            toast.error(err);
          }
        } else {
          toast.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id, isLoaded, isSignedIn, waitForToken, navigate, toast, addImages]);

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!draft || !layout) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Diseño no encontrado</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isEditing = draft.status === 'draft';
  const isLocked = draft.status === 'locked';
  const isOrdered = draft.status === 'ordered';
  const canAddToCart = (isEditing || isLocked) && !isInCart && !isOrdered;

  const handleAddToCart = async () => {
    if (!id) return;
    setIsAddingToCart(true);
    try {
      await apiClient.cart.addCartItem(id);
      const updatedDraft = await apiClient.drafts.getMyDraftById(id);
      setDraft(updatedDraft);
      setIsInCart(true);
      await refreshCart();
      toast.success('Agregado al carrito (diseño bloqueado)');
    } catch (err) {
      toast.error(err);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/account/my-designs')}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-semibold text-gray-900">{draft.title || 'Sin título'}</h1>
                <StatusBadge state={draft.status === 'draft' ? 'editing' : draft.status} />
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {canAddToCart && (
                <Button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="rounded-xl h-10 px-6 font-medium bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 shadow-sm hover:shadow"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
                </Button>
              )}
              {isInCart && (
                <Button
                  onClick={() => navigate('/cart')}
                  className="rounded-xl h-10 px-6 font-medium bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 shadow-sm hover:shadow"
                >
                  Ver en carrito
                </Button>
              )}
              {!isLocked && (
                <Button
                  onClick={() => navigate(`/draft/${id}/edit`)}
                  variant="outline"
                  className="rounded-xl h-10 px-6"
                >
                  Editar diseño
                </Button>
              )}
            </div>
          </div>
        </div>

        <CalendarEditor
          layout={layout}
          layoutItems={draft.layoutItems}
          images={uploadedImages}
          year={2026}
          title={draft.title || 'Sin título'}
          isLocked={isLocked}
          layoutMode={isMdOrLarger ? "grid" : "vertical"}
        />
      </div>
    </div>
  );
}
