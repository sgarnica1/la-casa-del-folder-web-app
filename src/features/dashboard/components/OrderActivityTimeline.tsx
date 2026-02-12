import { OrderActivity, OrderActivityType } from '@/types';
import { CheckCircle, Package, Truck, CreditCard, Clock, AlertCircle } from 'lucide-react';

interface OrderActivityTimelineProps {
  activities: OrderActivity[];
}

const ACTIVITY_CONFIG: Record<OrderActivityType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  [OrderActivityType.ORDER_PLACED]: {
    label: 'Pedido realizado',
    icon: Package,
    color: 'text-blue-600 bg-blue-50',
  },
  [OrderActivityType.PAYMENT_CONFIRMED]: {
    label: 'Pago confirmado',
    icon: CreditCard,
    color: 'text-green-600 bg-green-50',
  },
  [OrderActivityType.ORDER_READY]: {
    label: 'Pedido listo',
    icon: CheckCircle,
    color: 'text-amber-600 bg-amber-50',
  },
  [OrderActivityType.ORDER_SHIPPED]: {
    label: 'Pedido enviado',
    icon: Truck,
    color: 'text-purple-600 bg-purple-50',
  },
  [OrderActivityType.ORDER_DELIVERED]: {
    label: 'Pedido entregado',
    icon: CheckCircle,
    color: 'text-emerald-600 bg-emerald-50',
  },
  [OrderActivityType.STATUS_CHANGED]: {
    label: 'Estado cambiado',
    icon: AlertCircle,
    color: 'text-gray-600 bg-gray-50',
  },
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  in_production: 'En Producción',
  shipped: 'Enviado',
};

export function OrderActivityTimeline({ activities }: OrderActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actividad del Pedido</h2>
        <p className="text-gray-500 text-sm">No hay actividad registrada aún</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200/60 rounded-2xl p-8 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Actividad del Pedido</h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {[...activities].reverse().map((activity) => {
            const config = ACTIVITY_CONFIG[activity.activityType] || {
              label: activity.activityType,
              icon: Clock,
              color: 'text-gray-600 bg-gray-50',
            };
            const Icon = config.icon;

            return (
              <div key={activity.id} className="relative flex items-start gap-4">
                {/* Icon circle */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.color} flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.createdAt).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                  )}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (() => {
                    const previousStatus = activity.metadata.previousStatus;
                    const newStatus = activity.metadata.newStatus;
                    if (previousStatus && newStatus) {
                      const prevStatusStr = String(previousStatus);
                      const newStatusStr = String(newStatus);
                      return (
                        <div className="text-xs text-gray-500 mt-1">
                          <span>
                            De {STATUS_LABELS[prevStatusStr] || prevStatusStr} a {STATUS_LABELS[newStatusStr] || newStatusStr}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
