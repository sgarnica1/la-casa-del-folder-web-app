import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import JSZip from 'jszip';
import { Download, Copy, Package, CheckCircle } from 'lucide-react';
import { Skeleton, Button } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { OrderDetail, DesignSnapshotLayoutItem, DesignSnapshotImage } from '@/types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  in_production: 'En Producción',
  shipped: 'Enviado',
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
          return 'bg-primary/10 text-primary border-primary/20';
        case 'in_production':
          return 'bg-[#ffd000]/20 text-[#b89500] border-[#ffd000]/30';
        case 'shipped':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    } else {
      switch (status.toLowerCase()) {
        case 'pending':
          return 'bg-[#ffd000]/20 text-[#b89500] border-[#ffd000]/30';
        case 'paid':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'failed':
          return 'bg-accent/10 text-accent border-accent/20';
        case 'refunded':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        default:
          return 'bg-muted text-muted-foreground border-border';
      }
    }
  };

  const label = type === 'order'
    ? ORDER_STATUS_LABELS[status] || status
    : PAYMENT_STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
      {label}
    </span>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.orders.getOrderById(id);
        setOrder(data);

        const imageMap = new Map<string, string>();
        data.items.forEach((item) => {
          const snapshot = item.designSnapshotJson as {
            layoutItems?: DesignSnapshotLayoutItem[];
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
      } catch (err) {
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [id, toast]);

  const handleUpdateStatus = async (newStatus: 'in_production' | 'shipped') => {
    if (!order || !id) return;

    setIsUpdatingStatus(true);
    try {
      await apiClient.orders.updateOrderStatus(id, newStatus);
      setOrder({ ...order, orderStatus: newStatus });
      toast.success(`Estado actualizado a ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setIsUpdatingStatus(false);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Detalles del Pedido</h1>
        <Button
          onClick={handleDownloadAllImages}
          disabled={isDownloading}
          className="h-11 px-6 rounded-xl font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180 flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? 'Descargando...' : 'Descargar Todas las fotos (ZIP)'}
        </Button>
      </div>

      <div className="space-y-8">
        <div className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-semibold">Resumen del Pedido</h2>
            <div className="flex gap-2">
              <StatusBadge status={order.orderStatus} type="order" />
              <StatusBadge status={order.paymentStatus} type="payment" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">ID del Pedido</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{order.id.slice(0, 16)}...</span>
                <button
                  onClick={() => {
                    copyToClipboard(order.id);
                    toast.success('ID copiado');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copiar ID completo"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Fecha de Creación</div>
              <div className="text-sm">
                {new Date(order.createdAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <div className="md:col-span-3 pt-4 border-t border-gray-200">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Precio final</div>
              <div className="text-3xl font-bold text-gray-900">
                ${order.totalAmount}
                <span className="text-lg font-normal text-gray-500 ml-1">MXN</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Información del Cliente</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Nombre</div>
              <div className="text-sm font-medium">{customerName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <div className="text-sm">{order.customer?.email || 'No disponible'}</div>
            </div>
            {order.address && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Dirección de Envío</div>
                <div className="text-sm">
                  <div>{order.address.name}</div>
                  <div>{order.address.addressLine1}</div>
                  {order.address.addressLine2 && <div>{order.address.addressLine2}</div>}
                  <div>
                    {order.address.city}, {order.address.state} {order.address.postalCode}
                  </div>
                  <div>{order.address.country}</div>
                  {order.address.phone && <div className="mt-1">Tel: {order.address.phone}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {order.items.map((item) => (
          <div key={item.id} className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)] space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">Producto y Diseño</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Producto</div>
                  <div className="text-sm font-medium">{item.productNameSnapshot}</div>
                </div>
                {item.variantNameSnapshot && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Variante</div>
                    <div className="text-sm">{item.variantNameSnapshot}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Cantidad</div>
                  <div className="text-sm">{item.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Precio</div>
                  <div className="text-sm font-semibold">${item.priceSnapshot}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-4">Reconstrucción del Diseño</h3>
              <DesignReconstruction snapshot={item.designSnapshotJson} imageMap={imageMap} />
            </div>
          </div>
        ))}

        <div className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Acciones de Administrador</h2>
          <div className="flex gap-4">
            {order.orderStatus === 'new' && (
              <Button
                onClick={() => handleUpdateStatus('in_production')}
                disabled={isUpdatingStatus}
                className="h-12 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180 flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Marcar como En Producción
              </Button>
            )}
            {order.orderStatus === 'in_production' && (
              <Button
                onClick={() => handleUpdateStatus('shipped')}
                disabled={isUpdatingStatus}
                className="h-12 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-180 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Marcar como Enviado
              </Button>
            )}
            {order.orderStatus === 'shipped' && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle className="h-4 w-4" />
                Pedido completado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignReconstruction({
  snapshot,
  imageMap,
}: {
  snapshot: unknown;
  imageMap: Map<string, string>;
}) {
  if (!snapshot || typeof snapshot !== 'object') {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
        Datos de snapshot inválidos: {JSON.stringify(snapshot)}
      </div>
    );
  }

  const design = snapshot as {
    draftId?: string;
    productId?: string;
    templateId?: string | null;
    layoutItems?: DesignSnapshotLayoutItem[];
  };

  if (!design.layoutItems || !Array.isArray(design.layoutItems)) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
        layoutItems faltantes o inválidos: {JSON.stringify(design)}
      </div>
    );
  }

  const sortedItems = [...design.layoutItems].sort((a, b) => a.layoutIndex - b.layoutIndex);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Draft ID: <span className="font-mono">{design.draftId || 'N/A'}</span></div>
          <div>Product ID: <span className="font-mono">{design.productId || 'N/A'}</span></div>
          <div>Template ID: <span className="font-mono">{design.templateId || 'N/A'}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedItems.map((item, index) => (
          <LayoutItemRenderer key={index} item={item} imageMap={imageMap} />
        ))}
      </div>
    </div>
  );
}

function LayoutItemRenderer({
  item,
  imageMap,
}: {
  item: DesignSnapshotLayoutItem;
  imageMap: Map<string, string>;
}) {
  const monthLabel = getMonthLabel(item.layoutIndex);

  if (item.type === 'text') {
    return (
      <div className="border rounded-lg p-3 bg-muted/20">
        <div className="text-xs font-semibold text-primary mb-2">{monthLabel}</div>
        <div className="text-xs text-muted-foreground mb-1">Slot de Texto</div>
        <div className="text-xs text-muted-foreground">Índice: {item.layoutIndex}</div>
      </div>
    );
  }

  if (!item.images || item.images.length === 0) {
    return (
      <div className="border rounded-lg p-3 bg-muted/20">
        <div className="text-xs font-semibold text-primary mb-2">{monthLabel}</div>
        <div className="text-xs text-muted-foreground mb-2">Slot de foto</div>
        <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          Sin foto
        </div>
        <div className="text-xs text-muted-foreground mt-2">Índice: {item.layoutIndex}</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-blue-600">{monthLabel}</div>
        <div className="text-xs text-muted-foreground">#{item.layoutIndex}</div>
      </div>
      {item.images.map((image, imgIndex) => (
        <ImageRenderer
          key={imgIndex}
          image={image}
          imageUrl={imageMap.get(image.cloudinaryPublicId) || image.secureUrl}
          monthLabel={monthLabel}
        />
      ))}
    </div>
  );
}

function ImageRenderer({
  image,
  imageUrl,
  monthLabel,
}: {
  image: DesignSnapshotImage;
  imageUrl: string | undefined;
  monthLabel: string;
}) {
  const transform = image.transform as
    | { x?: number; y?: number; scale?: number; rotation?: number }
    | null;

  const style: React.CSSProperties = {
    width: '100%',
    height: '128px',
    objectFit: 'cover' as const,
    borderRadius: '4px',
  };

  if (transform) {
    const transforms: string[] = [];
    if (transform.x !== undefined || transform.y !== undefined) {
      transforms.push(`translate(${transform.x ?? 0}px, ${transform.y ?? 0}px)`);
    }
    if (transform.scale !== undefined) {
      transforms.push(`scale(${transform.scale})`);
    }
    if (transform.rotation !== undefined) {
      transforms.push(`rotate(${transform.rotation}deg)`);
    }
    if (transforms.length > 0) {
      style.transform = transforms.join(' ');
    }
  }

  const handleDownload = () => {
    if (imageUrl) {
      const filename = `${monthLabel}_${image.cloudinaryPublicId}.jpg`;
      downloadImage(imageUrl, filename);
    }
  };

  if (!imageUrl) {
    return (
      <div className="relative overflow-hidden rounded">
        <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
          foto no encontrada
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {image.width}x{image.height}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded group">
      <img
        src={imageUrl}
        alt={`Image ${image.cloudinaryPublicId}`}
        style={style}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const errorDiv = document.createElement('div');
            errorDiv.className =
              'w-full h-32 bg-destructive/10 flex items-center justify-center text-xs text-destructive';
            errorDiv.textContent = 'Error al cargar foto';
            parent.appendChild(errorDiv);
          }
        }}
      />
      <button
        onClick={handleDownload}
        className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        title="Descargar foto"
      >
        <Download className="h-4 w-4 text-gray-700" />
      </button>
      <div className="text-xs text-muted-foreground mt-1">
        {image.width}x{image.height}
      </div>
    </div>
  );
}
