import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton
} from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import type { OrderDetail } from '@/types';

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const draftId = searchParams.get('draftId'); // Legacy support for single draft orders
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  useApiClient();

  useEffect(() => {
    // If no orderId or draftId, redirect to cart or home
    if (!orderId && !draftId) {
      navigate('/cart');
      return;
    }

    // If we have orderId, fetch order details using user endpoint
    if (orderId) {
      setIsLoading(true);
      apiClient.orders.getMyOrderById(orderId)
        .then((orderData) => {
          setOrder(orderData);
        })
        .catch((err) => {
          console.error('Failed to fetch order:', err);
          toast.error('No se pudo cargar la información del pedido');
          navigate('/cart');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [orderId, draftId, navigate, toast]);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      if (orderId) {
        // Order already created from cart checkout, just confirm payment
        navigate(`/payment/confirmed?orderId=${orderId}`);
        toast.success('Pago procesado exitosamente');
      } else if (draftId) {
        // Legacy flow: create order from single draft
        const result = await apiClient.orders.createOrder(draftId);
        navigate(`/payment/confirmed?orderId=${result.orderId}`);
        toast.success('Pago procesado exitosamente');
      }
    } catch (err) {
      toast.error(err);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  const totalAmount = order ? Number(order.totalAmount) : 500; // Fallback for legacy draftId flow

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
                <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
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
              onClick={() => navigate('/cart')}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (orderId ? !order : false)}
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
