import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, MoreVertical } from 'lucide-react';
import { Skeleton, Button } from '@/components/ui';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/hooks/useToast';
import type { Order } from '@/types';

type OrderStatusFilter = 'all' | 'new' | 'in_production' | 'shipped';
type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'failed';

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

function StatusBadge({ status, type }: { status: string; type: 'order' | 'payment' }) {
  const getStatusColor = () => {
    if (type === 'order') {
      switch (status) {
        case 'new':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'in_production':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'shipped':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'paid':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'failed':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
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

function shortenId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 12)}...` : id;
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadAllOrders = async () => {
      setIsLoading(true);
      try {
        const allOrdersData: Order[] = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore && !cancelled) {
          const response = await apiClient.getAllOrders(currentPage, 100);
          if (response.data.length === 0) {
            hasMore = false;
          } else {
            allOrdersData.push(...response.data);
            if (response.data.length < 100 || currentPage >= response.totalPages) {
              hasMore = false;
            } else {
              currentPage++;
            }
          }
        }

        if (!cancelled) {
          setAllOrders(allOrdersData);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAllOrders();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.orderStatus === orderStatusFilter);
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentStatus === paymentStatusFilter);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allOrders, orderStatusFilter, paymentStatusFilter]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, page, limit]);

  const totalPages = Math.ceil(filteredOrders.length / limit);

  const handleRowClick = (orderId: string) => {
    navigate(`/dashboard/orders/${orderId}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Placeholder for menu actions
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-2xl font-bold mb-6">Pedidos</h1>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="order-status" className="text-sm font-medium text-muted-foreground">
            Estado del Pedido:
          </label>
          <select
            id="order-status"
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatusFilter)}
            className="border rounded px-3 py-1.5 text-sm bg-background"
          >
            <option value="all">Todos</option>
            <option value="new">Nuevo</option>
            <option value="in_production">En Producción</option>
            <option value="shipped">Enviado</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="payment-status" className="text-sm font-medium text-muted-foreground">
            Estado del Pago:
          </label>
          <select
            id="payment-status"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
            className="border rounded px-3 py-1.5 text-sm bg-background"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 border rounded bg-muted/20">
          <p className="text-muted-foreground">No hay pedidos aún</p>
        </div>
      ) : (
        <>
          <div className="border rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold">ID del Pedido</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">ID Usuario</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Estado Pedido</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold">Pago</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold">Total</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order.id)}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{shortenId(order.id)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(order.id);
                            toast.success('ID copiado');
                          }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copiar ID completo"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-muted-foreground">{shortenId(order.userId)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.orderStatus} type="order" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.paymentStatus} type="payment" />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">${order.totalAmount}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={handleMenuClick}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Más opciones"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, filteredOrders.length)} de {filteredOrders.length} pedidos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
