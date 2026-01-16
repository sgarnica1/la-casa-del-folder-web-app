import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient, ApiError } from '@/services/api-client';
import type { OrderDetail, DesignSnapshotLayoutItem, DesignSnapshotImage } from '@/types';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadOrder = async () => {
      try {
        const data = await apiClient.getOrderById(id);
        setOrder(data);

        // Orders are self-contained - images are snapshotted, no need to fetch from uploaded_images
        const imageMap = new Map<string, string>();
        data.items.forEach((item) => {
          const snapshot = item.designSnapshotJson as {
            layoutItems?: DesignSnapshotLayoutItem[];
          } | null;
          if (snapshot?.layoutItems) {
            snapshot.layoutItems.forEach((layoutItem) => {
              if (layoutItem.images) {
                layoutItem.images.forEach((img) => {
                  // Use snapshotted secureUrl directly - orders don't depend on uploaded_images
                  imageMap.set(img.cloudinaryPublicId, img.secureUrl);
                });
              }
            });
          }
        });
        setImageMap(imageMap);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.status}: ${err.message}`);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load order');
        }
      }
    };

    loadOrder();
  }, [id]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/dashboard/orders" className="text-sm text-muted-foreground hover:underline mb-4 block">
          ← Back to Orders
        </Link>
        <h1 className="text-2xl font-bold mb-4">Order Details</h1>
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link to="/dashboard/orders" className="text-sm text-muted-foreground hover:underline mb-4 block">
        ← Back to Orders
      </Link>

      <h1 className="text-2xl font-bold mb-6">Order Details</h1>

      <div className="space-y-6">
        <div className="border rounded p-4">
          <h2 className="font-bold mb-2">Order Metadata</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Order ID:</span> {order.id}
            </div>
            <div>
              <span className="text-muted-foreground">User ID:</span> {order.userId}
            </div>
            <div>
              <span className="text-muted-foreground">Created At:</span>{' '}
              {new Date(order.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="text-muted-foreground">Order Status:</span> {order.orderStatus}
            </div>
            <div>
              <span className="text-muted-foreground">Payment Status:</span> {order.paymentStatus}
            </div>
            <div>
              <span className="text-muted-foreground">Total Amount:</span> ${order.totalAmount}
            </div>
          </div>
        </div>

        {order.items.map((item) => (
          <div key={item.id} className="border rounded p-4 space-y-4">
            <div>
              <h2 className="font-bold mb-2">Order Item</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Product:</span> {item.productNameSnapshot}
                </div>
                {item.variantNameSnapshot && (
                  <div>
                    <span className="text-muted-foreground">Variant:</span> {item.variantNameSnapshot}
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Quantity:</span> {item.quantity}
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span> ${item.priceSnapshot}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-2">Design Reconstruction</h3>
              <DesignReconstruction snapshot={item.designSnapshotJson} imageMap={imageMap} />
            </div>
          </div>
        ))}
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
        Invalid snapshot data: {JSON.stringify(snapshot)}
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
        Missing or invalid layoutItems: {JSON.stringify(design)}
      </div>
    );
  }

  const sortedItems = [...design.layoutItems].sort((a, b) => a.layoutIndex - b.layoutIndex);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Draft ID: {design.draftId || 'N/A'} | Product ID: {design.productId || 'N/A'} | Template ID:{' '}
        {design.templateId || 'N/A'}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
  if (item.type === 'text') {
    return (
      <div className="border rounded p-2">
        <div className="text-xs text-muted-foreground mb-1">Text Slot (Index: {item.layoutIndex})</div>
        <div className="text-xs">
          Transform: {item.transformJson ? JSON.stringify(item.transformJson) : 'None'}
        </div>
      </div>
    );
  }

  if (!item.images || item.images.length === 0) {
    return (
      <div className="border rounded p-2">
        <div className="text-xs text-muted-foreground mb-1">Image Slot (Index: {item.layoutIndex})</div>
        <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-2 space-y-2">
      <div className="text-xs text-muted-foreground">Image Slot (Index: {item.layoutIndex})</div>
      {item.images.map((image, imgIndex) => (
        <ImageRenderer
          key={imgIndex}
          image={image}
          imageUrl={imageMap.get(image.cloudinaryPublicId) || image.secureUrl}
        />
      ))}
    </div>
  );
}

function ImageRenderer({
  image,
  imageUrl,
}: {
  image: DesignSnapshotImage;
  imageUrl: string | undefined;
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

  if (!imageUrl) {
    return (
      <div className="relative overflow-hidden rounded">
        <div className="w-full h-32 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          Image not found (Public ID: {image.cloudinaryPublicId})
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Public ID: {image.cloudinaryPublicId} ({image.width}x{image.height})
          {transform && <div>Transform: {JSON.stringify(transform)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded">
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
            errorDiv.textContent = 'Failed to load image';
            parent.appendChild(errorDiv);
          }
        }}
      />
      <div className="text-xs text-muted-foreground mt-1">
        Public ID: {image.cloudinaryPublicId} ({image.width}x{image.height})
        {transform && <div>Transform: {JSON.stringify(transform)}</div>}
      </div>
    </div>
  );
}
