import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { Draft } from '@/types';

export function CartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // If no draftId, try to get from localStorage or redirect
    const storedDraftId = localStorage.getItem('lastDraftId');
    if (!draftId && storedDraftId) {
      navigate(`/cart?draftId=${storedDraftId}`, { replace: true });
      return;
    }

    if (!draftId) {
      navigate('/product/calendar');
      return;
    }

    localStorage.setItem('lastDraftId', draftId);

    const loadDraft = async () => {
      try {
        const draftData = await apiClient.getDraft(draftId);
        setDraft(draftData);
      } catch (err) {
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [draftId, navigate, toast]);

  const handleContinueToPayment = () => {
    if (draftId) {
      navigate(`/payment?draftId=${draftId}`);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Carrito</h1>
            <p className="text-muted-foreground mt-2">
              Revisa tu pedido antes de continuar al pago
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              {draft && (
                <div>
                  <p className="text-sm text-muted-foreground">Producto</p>
                  <p className="font-medium">Calendario Personalizado</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">$500.00</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleContinueToPayment}
              size="lg"
            >
              Continuar al Pago
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
