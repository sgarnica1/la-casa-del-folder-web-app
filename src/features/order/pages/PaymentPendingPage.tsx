import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import type { OrderDetail } from '@/types';
import { Skeleton } from '@/components/ui';

export function PaymentPendingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference');
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
            <Clock className="h-16 w-16 text-yellow-500" />
            <h1 className="text-4xl font-bold">Pago Pendiente</h1>
            <p className="text-muted-foreground">
              Tu pago está siendo procesado. Te notificaremos cuando se complete.
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
                  Tu pedido está registrado y esperando confirmación de pago
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
                  <p className="font-medium capitalize text-yellow-600">{status || order.paymentStatus}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Próximos Pasos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Si elegiste un método de pago offline (efectivo), dirígete al punto de pago indicado</p>
              <p>• Completa el pago con el comprobante generado</p>
              <p>• Recibirás una notificación cuando el pago sea confirmado</p>
              <p>• Tu pedido será procesado una vez que el pago sea aprobado</p>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/account/order/history')}
              className="flex-1"
            >
              Ver Mis Pedidos
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
