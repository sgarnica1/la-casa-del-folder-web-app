import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { Order } from '@/types';

export function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    let cancelled = false;

    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.getAllOrders();
        if (!cancelled) {
          setOrders(data);
          hasLoadedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err);
          hasLoadedRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      }
    };

    loadOrders();

    return () => {
      cancelled = true;
      isLoadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Admin Orders Dashboard</h1>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Orders Dashboard</h1>

      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/dashboard/orders/${order.id}`}
              className="block border rounded p-4 hover:bg-muted/50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">Order ID: {order.id}</div>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${order.totalAmount}</div>
                  <div className="text-sm text-muted-foreground">
                    Status: {order.orderStatus} | Payment: {order.paymentStatus}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
