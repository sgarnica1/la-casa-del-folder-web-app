import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, Eye, Package, Truck, Lock, Check } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useApiClient } from '@/hooks/useApiClient';
import { useCart } from '@/contexts/CartContext';
import type { OrderDetail } from '@/types';
import { Skeleton } from '@/components/ui';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference') || searchParams.get('preference_id');
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { refreshCart } = useCart();
  useApiClient();

  useEffect(() => {
    if (!orderId) {
      navigate('/cart');
      return;
    }

    let isMounted = true;

    const loadOrder = async () => {
      setIsLoading(true);
      try {
        const orderData = await apiClient.orders.getMyOrderById(orderId);
        if (!isMounted) return;
        setOrder(orderData);

        // If paymentId is available and payment status is not "paid", verify the payment
        if (paymentId && orderData.paymentStatus !== 'paid') {
          try {
            const result = await apiClient.payments.verifyPayment(paymentId);
            if (!isMounted) return;

            // Refresh cart to clear it if payment was successful
            if (result.paymentStatus === 'paid') {
              await refreshCart();
            }

            // Reload order to get updated status
            const updatedOrder = await apiClient.orders.getMyOrderById(orderId);
            if (isMounted) {
              setOrder(updatedOrder);
            }
          } catch (err) {
            console.error('Failed to verify payment:', err);
            // Don't show error toast - payment might already be processed
          }
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        if (isMounted) {
          toast.error('No se pudo cargar la información del pedido');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, paymentId, navigate, toast, refreshCart]);

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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const priceParts = order ? formatPrice(Number(order.totalAmount)).split('.') : ['$0', '00'];
  const mainPrice = priceParts[0];
  const decimalPrice = priceParts[1] ? `.${priceParts[1]}` : '';

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="space-y-12">
            {/* Success Hero Section */}
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
                <CheckCircle2
                  className="relative h-24 w-24 text-green-600"
                  style={{
                    filter: 'drop-shadow(0 0 40px rgba(34, 197, 94, 0.25))',
                    animation: 'scaleIn 300ms ease-out',
                  }}
                />
              </div>
              <div className="space-y-3">
                <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
                  ¡Pago Exitoso!
                </h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  Tu pago ha sido procesado correctamente. Tu pedido está en camino.
                </p>
                {paymentId && (
                  <p className="text-xs text-gray-500 font-mono mt-4">
                    ID de pago: {paymentId}
                  </p>
                )}
              </div>
            </div>

            {/* Order Details Card */}
            {order && (
              <Card className="border-gray-200/60 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-shadow duration-180">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-gray-900">Detalles del Pedido</CardTitle>
                  <CardDescription className="text-base text-gray-600 mt-2">
                    Tu pedido ha sido registrado exitosamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Número de Pedido</p>
                    <p className="text-base font-semibold text-gray-900 font-mono">{order.id}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Monto Total</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {mainPrice}
                      <span className="text-xl font-normal text-gray-600">{decimalPrice}</span>
                      <span className="text-lg font-normal text-gray-500 ml-2">MXN</span>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Estado del Pago</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                      <Check className="h-4 w-4 text-green-700" />
                      <span className="text-sm font-medium text-green-700 capitalize">
                        {status === 'approved' || order.paymentStatus === 'paid' ? 'Pagado' : (status || order.paymentStatus)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* What Happens Next Section */}
            <Card className="border-gray-200/60 rounded-2xl shadow-sm bg-gray-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">¿Qué sigue ahora?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Recibirás un correo de confirmación</p>
                    <p className="text-xs text-gray-500 mt-0.5">Con todos los detalles de tu pedido</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Revisaremos tus fotos</p>
                    <p className="text-xs text-gray-500 mt-0.5">Para asegurar la mejor calidad</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tu pedido entrará en producción</p>
                    <p className="text-xs text-gray-500 mt-0.5">Procesaremos tu calendario personalizado</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Te notificaremos cuando se envíe</p>
                    <p className="text-xs text-gray-500 mt-0.5">Con información de seguimiento</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4">
              <Button
                onClick={() => navigate('/account/order/history')}
                className="w-full h-14 rounded-xl font-semibold text-base bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180"
              >
                Ver Mis Pedidos
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-xl font-medium text-base border-gray-300 hover:bg-gray-50 transition-all duration-180"
              >
                Volver al Inicio
              </Button>
            </div>

            {/* Trust Footer */}
            <div className="pt-8 space-y-3 text-center">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Pago procesado de forma segura</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>Te enviamos un correo con tu confirmación</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
