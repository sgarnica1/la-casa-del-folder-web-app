import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import type { OrderDetail } from '@/types';
import { Skeleton } from '@/components/ui';

export function PaymentFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference') || searchParams.get('preference_id');
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  useApiClient();

  useEffect(() => {
    if (!orderId) {
      navigate('/cart');
      return;
    }

    setIsLoading(true);
    apiClient.orders.getMyOrderById(orderId)
      .then((orderData) => {
        setOrder(orderData);
      })
      .catch((err) => {
        console.error('Failed to fetch order:', err);
        toast.error('No se pudo cargar la información del pedido');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId, navigate, toast]);

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

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <h1 className="text-4xl font-bold">Pago Rechazado</h1>
            <p className="text-muted-foreground">
              No se pudo procesar tu pago. Por favor, intenta nuevamente.
            </p>
            {paymentId && (
              <p className="text-sm text-muted-foreground">
                ID de pago: {paymentId}
              </p>
            )}
          </div>

          {order && (
            <Card>
              <CardHeader>
                <CardTitle>Información del Pedido</CardTitle>
                <CardDescription>
                  Tu pedido sigue pendiente de pago
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Pedido</p>
                  <p className="font-medium">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Total</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(Number(order.totalAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado del Pago</p>
                  <p className="font-medium capitalize text-red-600">{status || order.paymentStatus}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>¿Qué puedes hacer?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Verifica que los datos de tu tarjeta sean correctos</p>
                <p>• Asegúrate de tener fondos suficientes</p>
                <p>• Intenta con otro método de pago</p>
                <p>• Contacta a tu banco si el problema persiste</p>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              {order && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/payment?orderId=${order.id}`)}
                  className="flex-1"
                >
                  Intentar Nuevamente
                </Button>
              )}
              <Button
                onClick={() => navigate('/cart')}
                className="flex-1"
              >
                Volver al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
