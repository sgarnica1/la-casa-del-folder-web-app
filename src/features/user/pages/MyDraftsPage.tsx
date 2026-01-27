import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';

interface DraftSummary {
  id: string;
  title: string | null;
  state: string;
  updatedAt: string;
  coverUrl: string | null;
}

const STATE_LABELS: Record<string, string> = {
  editing: 'Draft',
  locked: 'Bloqueado',
  ordered: 'Ordenado',
};

const STATE_COLORS: Record<string, string> = {
  editing: 'bg-primary/10 text-primary border-primary/20',
  locked: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ordered: 'bg-green-100 text-green-800 border-green-200',
};

function StatusBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATE_COLORS[state] || 'bg-muted text-muted-foreground border-border'}`}>
      {STATE_LABELS[state] || state}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function MyDraftsPage() {
  const navigate = useNavigate();
  const { waitForToken, isLoaded, isSignedIn } = useWaitForToken();
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const loadDrafts = async () => {
      console.log('[MyDraftsPage] Waiting for token before loading drafts...');
      const token = await waitForToken();
      if (!token) {
        console.warn('[MyDraftsPage] No token available after retries, cannot load drafts');
        setIsLoading(false);
        return;
      }

      console.log('[MyDraftsPage] Token available, loading drafts...');
      try {
        const data = await apiClient.drafts.getMyDrafts();
        console.log('[MyDraftsPage] Received drafts from API:', {
          count: data.length,
          drafts: data.map(d => ({
            id: d.id,
            title: d.title,
            state: d.state,
            hasCoverUrl: !!d.coverUrl,
            coverUrl: d.coverUrl
          }))
        });
        setDrafts(data);
      } catch (err: unknown) {
        console.error('[MyDraftsPage] Error loading drafts:', err);
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403) {
            toast.error('No tienes acceso a este recurso');
            navigate('/', { replace: true });
          } else if (status === 401) {
            console.warn('[MyDraftsPage] 401 Unauthorized - authentication may not be ready');
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

    loadDrafts();
  }, [isLoaded, isSignedIn, waitForToken, navigate, toast]);

  const handleViewDraft = (draftId: string, state: string) => {
    if (state === 'editing' || state === 'draft') {
      navigate(`/draft/${draftId}/edit`, { state: { from: '/account/my-designs' } });
    } else {
      navigate(`/account/my-designs/${draftId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Mis Diseños</h1>
          <p className="text-muted-foreground">Gestiona tus diseños de calendario</p>
        </div>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-muted p-6">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">No tienes diseños aún</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Crea tu primer diseño personalizado y comienza a diseñar tu calendario
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/product/calendar')}
              size="lg"
              className="mt-4"
            >
              Crear diseño
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card key={draft.id}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="w-full h-48 rounded-md overflow-hidden border bg-muted mb-4">
                      {draft.coverUrl ? (
                        <img
                          src={draft.coverUrl}
                          alt={draft.title || 'Sin título'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('[MyDraftsPage] Image failed to load:', {
                              draftId: draft.id,
                              coverUrl: draft.coverUrl,
                              error: e
                            });
                          }}
                          onLoad={() => {
                            console.log('[MyDraftsPage] Image loaded successfully:', {
                              draftId: draft.id,
                              coverUrl: draft.coverUrl
                            });
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <Image className="h-12 w-12 mb-2 opacity-50" />
                          <span className="text-sm">Sin foto</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        {draft.title || 'Sin título'}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge state={draft.state} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Actualizado: {formatDate(draft.updatedAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleViewDraft(draft.id, draft.state)}
                      className="w-full"
                      variant={draft.state === 'editing' ? 'default' : 'outline'}
                    >
                      {draft.state === 'editing' ? 'Editar' : 'Ver'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
