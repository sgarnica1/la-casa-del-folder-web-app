import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import JSZip from 'jszip';
import { Download, Package, CheckCircle, X, RotateCcw, Truck, CheckCircle2, Receipt } from 'lucide-react';
import { Skeleton, Button } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import { OrderActivityTimeline } from '../components/OrderActivityTimeline';
import { OrderStatusTransitionDialog } from '../components/OrderStatusTransitionDialog';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import type { OrderDetail, DesignSnapshotLayoutItem, OrderActivity, Layout, LayoutItem, OrderStatus, OrderStatusTransition } from '@/types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nuevo',
  in_production: 'En Producción',
  ready: 'Listo',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  failed: 'Fallido',
};

function getMonthLabel(layoutIndex: number): string {
  if (layoutIndex === 0) return 'Portada';
  if (layoutIndex >= 1 && layoutIndex <= 12) {
    return MONTH_NAMES[layoutIndex - 1];
  }
  return `Slot ${layoutIndex}`;
}

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
}

async function downloadImagesAsZip(
  sortedItems: DesignSnapshotLayoutItem[],
  imageMap: Map<string, string>,
  orderId: string
) {
  const zip = new JSZip();

  for (const item of sortedItems) {
    if (item.images && item.images.length > 0) {
      for (const image of item.images) {
        const imageUrl = imageMap.get(image.cloudinaryPublicId) || image.secureUrl;
        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const monthLabel = getMonthLabel(item.layoutIndex);
            const filename = `${monthLabel}_${image.cloudinaryPublicId}.jpg`;
            zip.file(filename, blob);
          } catch (error) {
            console.error(`Error adding ${image.cloudinaryPublicId} to zip:`, error);
          }
        }
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(zipBlob);
  link.download = `pedido-${orderId.slice(0, 8)}-fotos.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
}

function StatusBadge({ status, type }: { status: string; type: 'order' | 'payment' }) {
  const getStatusColor = () => {
    if (type === 'order') {
      switch (status) {
        case 'new':
          return 'bg-blue-50 text-blue-700';
        case 'in_production':
          return 'bg-amber-50 text-amber-700';
        case 'shipped':
          return 'bg-emerald-50 text-emerald-700';
        default:
          return 'bg-gray-50 text-gray-700';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'pending':
          return 'bg-amber-50 text-amber-700';
        case 'paid':
          return 'bg-emerald-50 text-emerald-700';
        case 'failed':
          return 'bg-red-50 text-red-700';
        case 'refunded':
          return 'bg-purple-50 text-purple-700';
        default:
          return 'bg-gray-50 text-gray-700';
      }
    }
  };

  const label = type === 'order'
    ? ORDER_STATUS_LABELS[status as OrderStatus] || status
    : PAYMENT_STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {label}
    </span>
  );
}


export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map());
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<OrderStatusTransition | null>(null);
  const [availableTransitions, setAvailableTransitions] = useState<OrderStatusTransition[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      setIsLoading(true);
      try {
        const [data, activitiesData, transitionsData] = await Promise.all([
          apiClient.orders.getOrderById(id),
          apiClient.orders.getOrderActivities(id),
          apiClient.orders.getAvailableStatusTransitions(id),
        ]);
        setOrder(data);
        setActivities(activitiesData);
        setAvailableTransitions(transitionsData.transitions);

        const imageMap = new Map<string, string>();
        data.items.forEach((item) => {
          const snapshot = item.designSnapshotJson as {
            layoutItems?: DesignSnapshotLayoutItem[];
            templateId?: string | null;
          } | null;
          if (snapshot?.layoutItems) {
            snapshot.layoutItems.forEach((layoutItem) => {
              if (layoutItem.images) {
                layoutItem.images.forEach((img) => {
                  imageMap.set(img.cloudinaryPublicId, img.secureUrl);
                });
              }
            });
          }
        });
        setImageMap(imageMap);

        // Load layout for calendar view
        const firstItem = data.items[0];
        if (firstItem) {
          const snapshot = firstItem.designSnapshotJson as {
            templateId?: string | null;
          } | null;
          const templateId = snapshot?.templateId || 'calendar-template';
          const layoutData = await apiClient.layouts.getLayout(templateId);
          setLayout(layoutData);
        }
      } catch (err) {
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [id, toast]);

  const handleTransitionClick = (transition: OrderStatusTransition) => {
    setPendingTransition(transition);
    setShowConfirmDialog(true);
  };

  const handleConfirmStatusChange = async (note?: string) => {
    if (!order || !id || !pendingTransition) return;

    setShowConfirmDialog(false);
    setIsUpdatingStatus(true);
    try {
      await apiClient.orders.updateOrderStatus(id, pendingTransition.targetStatus, note);

      // Reload order and activities to show the new status change
      const [orderData, activitiesData, transitionsData] = await Promise.all([
        apiClient.orders.getOrderById(id),
        apiClient.orders.getOrderActivities(id),
        apiClient.orders.getAvailableStatusTransitions(id),
      ]);
      setOrder(orderData);
      setActivities(activitiesData);
      setAvailableTransitions(transitionsData.transitions);

      toast.success(`Estado actualizado a ${pendingTransition.label}`);
      setPendingTransition(null);
    } catch (err) {
      toast.error(err);
      setPendingTransition(null);
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const getTransitionIcon = (targetStatus: OrderStatus) => {
    switch (targetStatus) {
      case 'new':
        return <RotateCcw className="h-4 w-4" />;
      case 'in_production':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'refunded':
        return <Receipt className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTransitionButtonColor = (targetStatus: OrderStatus) => {
    switch (targetStatus) {
      case 'cancelled':
        return 'bg-red-600 hover:bg-red-700';
      case 'refunded':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'delivered':
        return 'bg-emerald-600 hover:bg-emerald-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const handleDownloadAllImages = async () => {
    if (!order) return;

    setIsDownloading(true);
    try {
      for (const item of order.items) {
        const snapshot = item.designSnapshotJson as {
          layoutItems?: DesignSnapshotLayoutItem[];
        } | null;
        if (snapshot?.layoutItems) {
          const sortedItems = [...snapshot.layoutItems].sort((a, b) => a.layoutIndex - b.layoutIndex);
          await downloadImagesAsZip(sortedItems, imageMap, order.id);
        }
      }
      toast.success('Descarga de fotos completada');
    } catch (error) {
      toast.error('Error al descargar fotos');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl font-semibold mb-4 text-primary">Detalles del Pedido</h1>
        <p className="text-muted-foreground">No se pudo cargar el pedido</p>
      </div>
    );
  }

  const customerName = [order.customer?.firstName, order.customer?.lastName]
    .filter(Boolean)
    .join(' ') || 'Cliente';

  // Calculate totals
  const subtotal = order.items.reduce((sum, item) => sum + parseFloat(item.priceSnapshot) * item.quantity, 0);
  const total = parseFloat(order.totalAmount);

  // Prepare calendar editor data from first item
  const firstItem = order.items[0];
  const calendarData = firstItem && layout ? (() => {
    const snapshot = firstItem.designSnapshotJson as {
      layoutItems?: DesignSnapshotLayoutItem[];
      title?: string | null;
    } | null;
    if (!snapshot?.layoutItems) return null;

    const layoutItems: LayoutItem[] = snapshot.layoutItems.map((item: DesignSnapshotLayoutItem) => {
      const imageId = item.images[0]?.uploadedImageId || item.images[0]?.cloudinaryPublicId || undefined;
      // Map transformJson to transform format expected by CalendarEditor
      let transform: LayoutItem['transform'] | undefined;
      if (item.transformJson) {
        const t = item.transformJson as { x?: number; y?: number; scale?: number; rotation?: number };
        transform = {
          x: t.x ?? 0,
          y: t.y ?? 0,
          scale: t.scale ?? 1,
          rotation: t.rotation ?? 0,
        };
      }
      return {
        id: `item-${item.layoutIndex}`,
        slotId: `slot-${item.layoutIndex}`,
        imageId,
        transform,
      };
    });

    const images = snapshot.layoutItems
      .flatMap((item: DesignSnapshotLayoutItem) => item.images)
      .map((img) => ({
        id: img.uploadedImageId || img.cloudinaryPublicId,
        url: imageMap.get(img.cloudinaryPublicId) || img.secureUrl,
      }));

    return { layoutItems, images, title: snapshot.title };
  })() : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Top Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Pedido #{order.id.slice(0, 8)}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>
                  {new Date(order.createdAt).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <StatusBadge status={order.orderStatus} type="order" />
              <StatusBadge status={order.paymentStatus} type="payment" />
            </div>
            {availableTransitions.map((transition) => (
              <Button
                key={transition.targetStatus}
                onClick={() => handleTransitionClick(transition)}
                disabled={isUpdatingStatus}
                className={`h-10 px-4 rounded-xl font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${getTransitionButtonColor(transition.targetStatus)}`}
              >
                {getTransitionIcon(transition.targetStatus)}
                {transition.label}
              </Button>
            ))}
            <Button
              onClick={handleDownloadAllImages}
              disabled={isDownloading}
              className="h-10 px-4 rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Descargando...' : 'Descargar ZIP'}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Purchased */}
          <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Productos Comprados</h2>
            <div className="space-y-4">
              {order.items.map((item) => {
                const snapshot = item.designSnapshotJson as { layoutItems?: DesignSnapshotLayoutItem[] } | null;
                const firstImage = snapshot?.layoutItems?.[0]?.images?.[0];
                const imageUrl = firstImage ? (imageMap.get(firstImage.cloudinaryPublicId) || firstImage.secureUrl) : null;

                return (
                  <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={item.productNameSnapshot}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.productNameSnapshot}</h3>
                      {item.variantNameSnapshot && (
                        <p className="text-sm text-gray-600 mb-2">{item.variantNameSnapshot}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Cantidad: <strong className="text-gray-900">{item.quantity}</strong></span>
                        <span>Precio: <strong className="text-gray-900">${item.priceSnapshot}</strong></span>
                        <span className="ml-auto font-semibold text-gray-900">
                          ${(parseFloat(item.priceSnapshot) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Details */}
          <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Detalles de Pago</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Envío</span>
                <span className="text-gray-900 font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Impuestos</span>
                <span className="text-gray-900 font-medium">$0.00</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${total.toFixed(2)}
                  <span className="text-lg font-normal text-gray-500 ml-1">MXN</span>
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Preview */}
          {calendarData && layout && (
            <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Vista Previa del Calendario</h2>
              <CalendarEditor
                layout={layout}
                layoutItems={calendarData.layoutItems}
                images={calendarData.images}
                year={2026}
                title={calendarData.title || undefined}
                isLocked={true}
                layoutMode="grid"
              />
            </div>
          )}

          {/* Images to Download */}
          <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Imágenes para Descargar</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {order.items.map((item) => {
                const snapshot = item.designSnapshotJson as { layoutItems?: DesignSnapshotLayoutItem[] } | null;
                if (!snapshot?.layoutItems) return null;

                return snapshot.layoutItems.map((layoutItem, idx) => {
                  if (!layoutItem.images || layoutItem.images.length === 0) return null;
                  const image = layoutItem.images[0];
                  const imageUrl = imageMap.get(image.cloudinaryPublicId) || image.secureUrl;
                  const monthLabel = getMonthLabel(layoutItem.layoutIndex);

                  return (
                    <div key={`${item.id}-${idx}`} className="relative group">
                      <img
                        src={imageUrl}
                        alt={monthLabel}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <button
                          onClick={() => downloadImage(imageUrl, `${monthLabel}_${image.cloudinaryPublicId}.jpg`)}
                          className="opacity-0 group-hover:opacity-100 bg-white p-2 rounded-full shadow-lg transition-opacity"
                          title="Descargar"
                        >
                          <Download className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-center">{monthLabel}</p>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Customer Information */}
            <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nombre</div>
                  <div className="text-sm font-semibold text-gray-900">{customerName}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</div>
                  <div className="text-sm text-gray-700">{order.customer?.email || 'No disponible'}</div>
                </div>
                {order.address?.phone && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Teléfono</div>
                    <div className="text-sm text-gray-700">{order.address.phone}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            {(() => {
              const shippingAddress = order.shippingAddressJson as {
                addressLine1?: string;
                addressLine2?: string | null;
                city?: string;
                state?: string;
                postalCode?: string;
                country?: string;
                customer?: {
                  firstName?: string | null;
                  lastName?: string | null;
                  email?: string;
                  phone?: string | null;
                };
              } | null;

              if (!shippingAddress || !shippingAddress.addressLine1) {
                return null;
              }

              return (
                <div className="border border-gray-200/60 rounded-2xl p-6 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de Envío</h2>
                  <div className="text-sm text-gray-700 space-y-1 leading-relaxed">
                    {shippingAddress.customer?.firstName || shippingAddress.customer?.lastName ? (
                      <div className="font-medium text-gray-900 mb-2">
                        {[shippingAddress.customer.firstName, shippingAddress.customer.lastName].filter(Boolean).join(' ')}
                      </div>
                    ) : null}
                    <div>{shippingAddress.addressLine1}</div>
                    {shippingAddress.addressLine2 && <div>{shippingAddress.addressLine2}</div>}
                    <div>
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                    </div>
                    <div>{shippingAddress.country}</div>
                    {shippingAddress.customer?.phone && <div className="mt-2 text-gray-600">Tel: {shippingAddress.customer.phone}</div>}
                  </div>
                </div>
              );
            })()}

            {/* Activity Timeline */}
            <OrderActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      {/* Status Transition Dialog */}
      {pendingTransition && (
        <OrderStatusTransitionDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          currentStatus={order.orderStatus}
          targetStatus={pendingTransition.targetStatus}
          targetLabel={pendingTransition.label}
          requiresNote={pendingTransition.requiresNote}
          onConfirm={handleConfirmStatusChange}
          isUpdating={isUpdatingStatus}
        />
      )}
    </div>
  );
}

