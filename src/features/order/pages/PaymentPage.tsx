import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet } from '@mercadopago/sdk-react';
import {
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
  const draftId = searchParams.get('draftId');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isLoadingPreference, setIsLoadingPreference] = useState(false);
  const toast = useToast();
  useApiClient();


  useEffect(() => {
    if (!orderId && !draftId) {
      navigate('/cart');
      return;
    }

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

  useEffect(() => {
    if (orderId && order) {
      setIsLoadingPreference(true);
      apiClient.payments.createPreference(orderId)
        .then((response) => {
          setPreferenceId(response.preferenceId);
        })
        .catch((err) => {
          console.error('Failed to create payment preference:', err);
          toast.error('No se pudo crear la preferencia de pago');
        })
        .finally(() => {
          setIsLoadingPreference(false);
        });
    }
  }, [orderId, order, toast]);

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

  if (!order && orderId) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold">Error</h1>
            <p className="text-muted-foreground">No se pudo cargar la información del pedido</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const totalAmount = order ? Number(order.totalAmount) : 0;

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
                Resumen de tu pedido
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
              </div>

              {order && order.items && order.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Items en tu pedido</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.productNameSnapshot} x{item.quantity} - {formatPrice(Number(item.priceSnapshot) * item.quantity)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
              <CardDescription>
                Selecciona tu método de pago preferido
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreference ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : preferenceId ? (
                <div id="walletBrick_container">
                  <Wallet
                    initialization={{ preferenceId }}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cargando opciones de pago...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
