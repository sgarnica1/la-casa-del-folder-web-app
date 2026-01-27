import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import { ShoppingBag } from 'lucide-react';

interface OrderSummary {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  title: string | null;
  coverUrl: string | null;
  productName: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'En preparación',
  in_production: 'En producción',
  shipped: 'Enviado',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  in_production: 'bg-amber-50 text-amber-700 border-amber-200',
  shipped: 'bg-green-50 text-green-700 border-green-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getProductName(productName: string | null): string {
  return productName || 'Datos no disponibles';
}

export function MyOrdersPage() {
  const navigate = useNavigate();
  const { waitForToken, isLoaded, isSignedIn } = useWaitForToken();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
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

    const loadOrders = async () => {
      const token = await waitForToken();
      if (!token) {
        console.warn('[MyOrdersPage] No token available, cannot load orders');
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiClient.orders.getMyOrders();
        setOrders(data);
      } catch (err: unknown) {
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403) {
            toast.error('No tienes acceso a este recurso');
            navigate('/', { replace: true });
          } else if (status === 401) {
            console.warn('[MyOrdersPage] 401 Unauthorized - authentication may not be ready');
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

    loadOrders();
  }, [isLoaded, isSignedIn, waitForToken, navigate, toast]);

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
          <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
          <p className="text-muted-foreground">Consulta el estado de tus pedidos</p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-muted p-6">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">No tienes pedidos aún</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Cuando realices un pedido, aparecerá aquí para que puedas hacer seguimiento de su estado
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/product/calendar')}
              size="lg"
              className="mt-4"
            >
              Ver productos
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {order.coverUrl && (
                      <div className="w-full h-36 rounded-md overflow-hidden border bg-muted">
                        <img
                          src={order.coverUrl}
                          alt={getProductName(order.productName)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg leading-tight">
                        {getProductName(order.productName)}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!order.productName && (
                          <p className="text-xs text-muted-foreground italic">
                            Información no disponible
                          </p>
                        )}
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="pt-2 border-t space-y-2">
                      <p className="text-base font-semibold">
                        {formatCurrency(order.total)} <span className="text-muted-foreground text-xs">MXN</span>
                      </p>
                      <Button
                        onClick={() => navigate(`/account/order/${order.id}`)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Ver pedido
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
