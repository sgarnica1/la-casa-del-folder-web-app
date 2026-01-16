import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { apiClient } from '@/services/api-client';

const HARDCODED_PRODUCT_ID = 'calendar';
const HARDCODED_TEMPLATE_ID = 'calendar-template';

export function ProductDetailPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePersonalize = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const draft = await apiClient.createDraft(HARDCODED_PRODUCT_ID, HARDCODED_TEMPLATE_ID);
      navigate(`/draft/${draft.id}/upload`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Calendario Personalizado</h1>
          <p className="text-muted-foreground mt-2">
            Crea tu calendario personalizado con tus fotos favoritas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendario 2024</CardTitle>
            <CardDescription>
              Calendario de pared con 12-13 meses. Personaliza cada mes con tus propias fotos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">$29.99</span>
              <span className="text-muted-foreground">MXN</span>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              onClick={handlePersonalize}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? 'Creando...' : 'Personalizar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
