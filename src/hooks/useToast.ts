import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';

export function useToast() {
  const showError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 409:
          toast.error('El recurso ya fue modificado. Por favor, recarga la página.', {
            description: 'Otra persona puede haber realizado cambios.',
          });
          break;
        case 403:
          toast.error('No tienes acceso a este recurso');
          break;
        case 404:
          toast.error('No se encontró el recurso', {
            description: 'Puede que haya sido eliminado o no exista.',
          });
          break;
        case 401:
          toast.error('Sesión expirada', {
            description: 'Por favor, inicia sesión nuevamente.',
            id: 'auth-error',
          });
          break;
        case 0:
          toast.error('Error de conexión', {
            description: 'No se pudo conectar con el servidor. Verifica tu conexión.',
            id: 'connection-error',
          });
          break;
        default:
          toast.error(error.message || 'Ocurrió un error');
      }
    } else if (error instanceof Error) {
      const isConnectionError = error.message.includes('Failed to fetch') ||
        error.message.includes('conectar') ||
        error.message.includes('connection');

      if (isConnectionError) {
        toast.error('Error de conexión', {
          description: 'No se pudo conectar con el servidor. Verifica tu conexión.',
          id: 'connection-error',
        });
      } else {
        toast.error(error.message || 'Ocurrió un error');
      }
    } else {
      toast.error('Ocurrió un error inesperado');
    }
  }, []);

  return useMemo(
    () => ({
      error: showError,
      success: (message: string, description?: string) => {
        toast.success(message, description ? { description } : undefined);
      },
      info: (message: string, description?: string) => {
        toast.info(message, description ? { description } : undefined);
      },
      warning: (message: string, description?: string) => {
        toast.warning(message, description ? { description } : undefined);
      },
    }),
    [showError]
  );
}
