import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, MoreVertical, Loader2 } from 'lucide-react';
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
          return 'bg-blue-50 text-blue-700';
        case 'in_production':
          return 'bg-amber-50 text-amber-700';
        case 'shipped':
          return 'bg-emerald-50 text-emerald-700';
        default:
          return 'bg-gray-50 text-gray-700';
      }
    } else {
      switch (status) {
        case 'paid':
          return 'bg-emerald-50 text-emerald-700';
        case 'pending':
          return 'bg-amber-50 text-amber-700';
        case 'failed':
          return 'bg-red-50 text-red-700';
        default:
          return 'bg-gray-50 text-gray-700';
      }
    }
  };

  const label = type === 'order'
    ? ORDER_STATUS_LABELS[status] || status
    : PAYMENT_STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
  const toast = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadAllOrders = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const allOrdersData: Order[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await apiClient.orders.getAllOrders(currentPage, 100);
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

      setAllOrders(allOrdersData);
      setLastUpdateTime(new Date());
    } catch (err) {
      if (!silent) {
        toast.error(err);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllOrders();

    intervalRef.current = setInterval(() => {
      loadAllOrders(true);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
        <h1 className="text-3xl font-semibold mb-8 text-gray-900">Pedidos</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins === 0) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;

    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Pedidos</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isRefreshing && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Actualizando...</span>
            </>
          )}
          {!isRefreshing && lastUpdateTime && (
            <span>Última actualización: {formatLastUpdate(lastUpdateTime)}</span>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label htmlFor="order-status" className="text-sm font-medium text-gray-700">
            Estado del Pedido:
          </label>
          <select
            id="order-status"
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatusFilter)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-180"
          >
            <option value="all">Todos</option>
            <option value="new">Nuevo</option>
            <option value="in_production">En Producción</option>
            <option value="shipped">Enviado</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="payment-status" className="text-sm font-medium text-gray-700">
            Estado del Pago:
          </label>
          <select
            id="payment-status"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-180"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 border border-gray-200/60 rounded-2xl bg-gray-50/50 shadow-sm">
          <p className="text-gray-500">No hay pedidos aún</p>
        </div>
      ) : (
        <>
          <div className="border border-gray-200/60 rounded-2xl overflow-hidden bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200/60">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">ID del Pedido</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">ID Usuario</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado Pedido</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Pago</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => handleRowClick(order.id)}
                    className="border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-all duration-180"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-900">{shortenId(order.id)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(order.id);
                            toast.success('ID copiado');
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors duration-180"
                          title="Copiar ID completo"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-500">{shortenId(order.userId)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.orderStatus} type="order" />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.paymentStatus} type="payment" />
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">${order.totalAmount}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={handleMenuClick}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-180"
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
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, filteredOrders.length)} de {filteredOrders.length} pedidos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-180"
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
                        className={`w-10 rounded-xl transition-all duration-180 ${
                          page === pageNum
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
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
                  className="rounded-xl border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-180"
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
