import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, ApiError } from '@/services/api-client';
import type { Order } from '@/types';

export function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await apiClient.getAllOrders();
        setOrders(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Error ${err.status}: ${err.message}`);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load orders');
        }
      }
    };

    loadOrders();
  }, []);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Admin Orders Dashboard</h1>
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
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
