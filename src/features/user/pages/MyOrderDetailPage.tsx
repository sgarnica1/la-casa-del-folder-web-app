import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import type { Layout, DesignSnapshot, DesignSnapshotLayoutItem, LayoutItem } from '@/types';

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

export function MyOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { waitForToken, isLoaded, isSignedIn } = useWaitForToken();
  const [order, setOrder] = useState<{
    id: string;
    totalAmount: number;
    orderStatus: string;
    items: Array<{
      id: string;
      productNameSnapshot: string;
      quantity: number;
      priceSnapshot: number;
      designSnapshotJson: DesignSnapshot;
    }>;
    createdAt: string;
  } | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      const token = await waitForToken();
      if (!token) {
        console.warn('[MyOrderDetailPage] No token available, cannot load order');
        setIsLoading(false);
        return;
      }

      try {
        const orderData = await apiClient.getMyOrderById(id);
        setOrder({
          id: orderData.id,
          totalAmount: parseFloat(orderData.totalAmount),
          orderStatus: orderData.orderStatus,
          items: orderData.items.map(item => ({
            id: item.id,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            priceSnapshot: parseFloat(item.priceSnapshot),
            designSnapshotJson: item.designSnapshotJson as DesignSnapshot,
          })),
          createdAt: orderData.createdAt,
        });

        const firstItem = orderData.items[0];
        if (firstItem) {
          const snapshot = firstItem.designSnapshotJson as DesignSnapshot;
          const templateId = snapshot.templateId || 'calendar-template';
          const layoutData = await apiClient.getLayout(templateId);
          setLayout(layoutData);
        }
      } catch (err: unknown) {
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 403) {
            toast.error('No tienes acceso a este pedido');
            navigate('/account/order/history', { replace: true });
          } else if (status === 404) {
            toast.error('Pedido no encontrado');
            navigate('/account/order/history', { replace: true });
          } else if (status === 401) {
            console.warn('[MyOrderDetailPage] 401 Unauthorized - authentication may not be ready');
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

    loadData();
  }, [id, isLoaded, isSignedIn, waitForToken, navigate, toast]);

  if (isLoading) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!order || !layout) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Pedido no encontrado</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const firstItem = order.items[0];
  if (!firstItem) {
    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">El pedido no tiene items</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const snapshot = firstItem.designSnapshotJson;

  const layoutItems: LayoutItem[] = snapshot.layoutItems.map((item: DesignSnapshotLayoutItem) => {
    const imageId = item.images[0]?.uploadedImageId || item.images[0]?.cloudinaryPublicId || undefined;
    return {
      id: `item-${item.layoutIndex}`,
      slotId: `slot-${item.layoutIndex}`,
      imageId,
    };
  });

  const images = snapshot.layoutItems
    .flatMap((item: DesignSnapshotLayoutItem) => item.images)
    .map((img) => ({
      id: img.uploadedImageId || img.cloudinaryPublicId,
      url: img.secureUrl,
    }));

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/account/order/history')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {snapshot.title || 'Diseño sin título'}
              </h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.orderStatus} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Fecha: {formatDate(order.createdAt)}
            </div>
            <div className="text-xl font-semibold">
              Total: {formatCurrency(order.totalAmount)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Producto</h2>
                <p className="text-muted-foreground">{firstItem.productNameSnapshot}</p>
                <p className="text-sm text-muted-foreground mt-1">Cantidad: {firstItem.quantity}</p>
              </div>
            </CardContent>
          </Card>

          <CalendarEditor
            layout={layout}
            layoutItems={layoutItems}
            images={images}
            year={2026}
            title={snapshot.productId || 'Calendario'}
            isLocked={true}
            layoutMode="grid"
          />

        </div>
      </div>
    </div>
  );
}
