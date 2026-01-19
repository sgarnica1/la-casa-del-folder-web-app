import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';

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
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const data = await apiClient.getMyDrafts();
        setDrafts(data);
      } catch (err: unknown) {
        if (err instanceof Error && 'status' in err && (err as { status: number }).status === 403) {
          toast.error('No tienes acceso a este recurso');
          navigate('/', { replace: true });
        } else {
          toast.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDrafts();
  }, [navigate, toast]);

  const handleViewDraft = (draftId: string, state: string) => {
    if (state === 'editing' || state === 'draft') {
      navigate(`/draft/${draftId}/edit`);
    } else {
      navigate(`/account/my-designs/${draftId}`);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mis Diseños</h1>
        <p className="text-muted-foreground">Gestiona tus diseños de calendario</p>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No tienes diseños aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {draft.coverUrl && (
                    <div className="w-full h-48 rounded-md overflow-hidden border bg-muted mb-4">
                      <img
                        src={draft.coverUrl}
                        alt={draft.title || 'Sin título'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
  );
}
