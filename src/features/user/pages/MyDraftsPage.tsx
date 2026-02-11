import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image, Lock, MoreVertical, Edit } from 'lucide-react';
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
  productName: string | null;
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
          <h1 className="text-3xl font-semibold mb-2">Mis Diseños</h1>
          <p className="text-muted-foreground">Gestiona y edita todos tus diseños</p>
        </div>

        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-muted p-6">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">No tienes diseños aún</h2>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className="group relative overflow-hidden border-gray-200/60 rounded-2xl shadow-sm transition-shadow duration-200 ease-out"
                style={{
                  transform: 'translateY(0)',
                  willChange: 'transform',
                  transition: 'transform 150ms ease-out, box-shadow 200ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    {/* 3-dot menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('Funcionalidad próximamente disponible');
                      }}
                      className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-white shadow-sm cursor-pointer"
                      aria-label="Más opciones"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>

                    {/* Image container with 16:9 ratio */}
                    <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl bg-muted">
                      {draft.coverUrl ? (
                        <>
                          <img
                            src={draft.coverUrl}
                            alt={draft.title || 'Sin título'}
                            className="w-full h-full object-cover"
                            style={{
                              transform: 'scale(1)',
                              willChange: 'transform',
                              transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.03)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
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
                          {/* Subtle gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <Image className="h-10 w-10 mb-2 opacity-40" />
                          <span className="text-xs">Sin foto</span>
                        </div>
                      )}
                    </div>

                    {/* Content section */}
                    <div className="p-5 space-y-3">
                      {/* Title and Product Name */}
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                          {draft.title || 'Sin título'}
                        </h3>
                        {draft.productName && (
                          <p className="text-sm text-gray-500 font-normal">
                            {draft.productName}
                          </p>
                        )}
                      </div>

                      {/* Status Badge and Date */}
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge state={draft.state} />
                        <p className="text-xs text-gray-400">
                          {formatDate(draft.updatedAt)}
                        </p>
                      </div>

                      {/* Primary Action Button */}
                      <Button
                        onClick={() => handleViewDraft(draft.id, draft.state)}
                        className="w-full rounded-xl h-10 font-medium bg-gray-900 hover:bg-gray-800 text-white transition-colors duration-150 shadow-sm hover:shadow"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar diseño
                      </Button>
                    </div>
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
