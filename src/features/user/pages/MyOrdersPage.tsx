import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import { ShoppingBag, MoreVertical, Package, Truck, Clock } from 'lucide-react';

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
  new: 'bg-blue-50 text-blue-700',
  in_production: 'bg-amber-50 text-amber-700',
  shipped: 'bg-emerald-50 text-emerald-700',
};

const STATUS_ICONS: Record<string, typeof Package> = {
  new: Clock,
  in_production: Package,
  shipped: Truck,
};

function StatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICONS[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-50 text-gray-700'}`}>
      {Icon && <Icon className="h-3 w-3" />}
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
          <h1 className="text-3xl font-semibold mb-2">Mis Pedidos</h1>
          <p className="text-muted-foreground">Consulta el estado de tus pedidos</p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-muted p-6">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">No tienes pedidos aún</h2>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="group relative overflow-hidden border-gray-200/60 rounded-2xl shadow-sm transition-shadow duration-200 ease-out"
                style={{
                  transform: 'translateY(0)',
                  willChange: 'transform',
                  transition: 'transform 150ms ease-out, box-shadow 200ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    {/* 3-dot menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('Funcionalidad próximamente disponible');
                      }}
                      className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-white shadow-sm cursor-pointer"
                      aria-label="Más opciones"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>

                    {/* Image container with 16:9 ratio */}
                    {order.coverUrl && (
                      <div className="relative w-full aspect-video overflow-hidden rounded-t-2xl bg-muted">
                        <img
                          src={order.coverUrl}
                          alt={getProductName(order.productName)}
                          className="w-full h-full object-cover"
                          style={{
                            transform: 'scale(1)',
                            willChange: 'transform',
                            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.03)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        />
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Content section */}
                    <div className="p-5 space-y-3">
                      {/* Title and Product Name */}
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                          {getProductName(order.productName)}
                        </h3>
                        {order.title && (
                          <p className="text-sm text-gray-500 font-normal">
                            {order.title}
                          </p>
                        )}
                      </div>

                      {/* Status Badge and Date */}
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={order.status} />
                        <p className="text-xs text-gray-400">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      {/* Price and Action Button */}
                      <div className="pt-2 border-t border-gray-100 space-y-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                          <span className="text-xs text-gray-500 font-normal ml-1">MXN</span>
                        </p>
                        <Button
                          onClick={() => navigate(`/account/order/${order.id}`)}
                          className="w-full rounded-xl h-10 font-medium bg-gray-900 hover:bg-gray-800 text-white transition-colors duration-150 shadow-sm hover:shadow"
                        >
                          Ver pedido
                        </Button>
                      </div>
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
