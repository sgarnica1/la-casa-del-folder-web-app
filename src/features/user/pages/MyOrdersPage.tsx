import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';

interface OrderSummary {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  title: string | null;
  coverUrl: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  in_production: 'En Producción',
  shipped: 'Enviado',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-primary/10 text-primary border-primary/20',
  in_production: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || 'bg-muted text-muted-foreground border-border'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function getOrderTitle(title: string | null): string {
  return title || 'Diseño sin título';
}

export function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await apiClient.getMyOrders();
        setOrders(data);
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

    loadOrders();
  }, [navigate, toast]);

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
        <h1 className="text-3xl font-bold mb-2">Mis Pedidos</h1>
        <p className="text-muted-foreground">Consulta el estado de tus pedidos</p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No tienes pedidos aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {order.coverUrl && (
                    <div className="w-full h-48 rounded-md overflow-hidden border bg-muted mb-4">
                      <img
                        src={order.coverUrl}
                        alt={getOrderTitle(order.title)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      {getOrderTitle(order.title)}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/account/order/${order.id}`)}
                    variant="outline"
                    className="w-full"
                  >
                    Ver pedido
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
