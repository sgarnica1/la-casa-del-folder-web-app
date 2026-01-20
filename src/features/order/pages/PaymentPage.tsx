import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // If no draftId, redirect to cart or home
    if (!draftId) {
      navigate('/cart');
    }
  }, [draftId, navigate]);

  const handlePayment = async () => {
    if (!draftId) return;

    setIsProcessing(true);

    try {
      // Create order (this is the "fake payment" - order confirmation)
      const result = await apiClient.createOrder(draftId);
      localStorage.setItem(`order-${draftId}`, result.orderId);

      // Navigate to payment confirmed with order ID
      navigate(`/payment/confirmed?orderId=${result.orderId}`);
      toast.success('Pago procesado exitosamente');
    } catch (err) {
      toast.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold">Pago</h1>
            <p className="text-muted-foreground mt-2">
              Completa tu pago para finalizar tu pedido
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Información de Pago</CardTitle>
              <CardDescription>
                Pago simulado - En desarrollo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">$500.00</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Método de Pago</p>
                <p className="text-sm text-muted-foreground">
                  Tarjeta de crédito •••• •••• •••• 4242
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              size="lg"
              className="flex-1"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
