import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Textarea } from '@/components/ui';
import type { OrderStatus } from '@/types';

interface OrderStatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  targetLabel: string;
  requiresNote: boolean;
  onConfirm: (note?: string) => void;
  isUpdating?: boolean;
}

export function OrderStatusTransitionDialog({
  open,
  onOpenChange,
  targetStatus,
  targetLabel,
  requiresNote,
  onConfirm,
  isUpdating = false,
}: OrderStatusTransitionDialogProps) {
  const [note, setNote] = useState('');

  const handleConfirm = () => {
    if (requiresNote && !note.trim()) {
      return;
    }
    onConfirm(requiresNote ? note.trim() : undefined);
    setNote('');
  };

  const handleCancel = () => {
    setNote('');
    onOpenChange(false);
  };

  const isTerminal = targetStatus === 'delivered' || targetStatus === 'refunded';
  const isCancelled = targetStatus === 'cancelled';
  const isRefunded = targetStatus === 'refunded';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} closeOnOutsideClick={!isUpdating}>
      <DialogContent className="sm:max-w-md rounded-2xl border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader>
          <div className="flex items-start gap-3 mb-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${
              isTerminal || isRefunded ? 'bg-red-100' : isCancelled ? 'bg-amber-100' : 'bg-blue-100'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                isTerminal || isRefunded ? 'text-red-600' : isCancelled ? 'text-amber-600' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 text-left">
                Confirmar cambio de estado
              </DialogTitle>
            </div>
          </div>
          <div className="text-left pt-2">
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de que deseas cambiar el estado del pedido a{' '}
              <strong className="text-gray-900 font-semibold">{targetLabel}</strong>?
            </p>
            {(isTerminal || isCancelled || isRefunded) && (
              <div className={`rounded-xl p-4 mb-4 ${
                isTerminal || isRefunded ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <p className={`text-sm font-semibold mb-1 ${
                  isTerminal || isRefunded ? 'text-red-800' : 'text-amber-800'
                }`}>
                  {isTerminal ? 'Estado terminal' : isRefunded ? 'Reembolso permanente' : 'Acción irreversible'}
                </p>
                <p className={`text-xs ${
                  isTerminal || isRefunded ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {isTerminal
                    ? 'Este estado es terminal y no se puede cambiar.'
                    : isRefunded
                    ? 'El reembolso será permanente y se registrará en el historial del pedido.'
                    : 'El cambio de estado será permanente y se registrará en el historial del pedido.'}
                </p>
              </div>
            )}
            {requiresNote && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nota <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explica el motivo del cambio de estado..."
                  rows={4}
                  className="rounded-xl border-gray-300 focus:border-gray-900 focus:ring-gray-900 resize-none"
                  disabled={isUpdating}
                />
                {!note.trim() && (
                  <p className="text-xs text-red-600">
                    Se requiere una nota para este cambio de estado
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-0 sm:justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
            className="w-full sm:w-auto rounded-xl border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating || (requiresNote && !note.trim())}
            className={`w-full sm:w-auto rounded-xl disabled:opacity-50 shadow-sm hover:shadow-md transition-all duration-180 ${
              isTerminal || isRefunded
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : isCancelled
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isUpdating ? 'Actualizando...' : 'Confirmar cambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
