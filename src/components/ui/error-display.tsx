import { WifiOff, RefreshCw, Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from './index';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  description?: string;
  status?: number;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

const getErrorIcon = (status?: number) => {
  if (!status || status === 0) {
    return WifiOff;
  }
  return AlertCircle;
};

const getErrorTitle = (status?: number, defaultTitle?: string): string => {
  if (defaultTitle) return defaultTitle;

  if (!status) return 'Error de conexión';

  switch (status) {
    case 400:
      return 'Solicitud inválida';
    case 401:
      return 'No autorizado';
    case 403:
      return 'Acceso denegado';
    case 404:
      return 'No encontrado';
    case 409:
      return 'Conflicto';
    case 422:
      return 'Error de validación';
    case 500:
      return 'Error del servidor';
    default:
      return 'Error';
  }
};

const getErrorDescription = (status?: number, message?: string, customDescription?: string): string => {
  if (customDescription) return customDescription;

  if (!status || status === 0) {
    return 'No pudimos conectarnos en este momento. Revisa tu conexión o intenta nuevamente en unos segundos.';
  }

  switch (status) {
    case 400:
      return message || 'La solicitud contiene datos inválidos.';
    case 401:
      return 'Tu sesión ha expirado o no tienes permisos. Por favor, inicia sesión nuevamente.';
    case 403:
      return 'No tienes permisos para acceder a este recurso.';
    case 404:
      return message || 'El recurso que buscas no existe o ha sido eliminado.';
    case 409:
      return message || 'El recurso ha sido modificado. Por favor, recarga la página.';
    case 422:
      return message || 'Los datos proporcionados no son válidos.';
    case 500:
      return 'Ocurrió un error en el servidor. Por favor, intenta más tarde.';
    default:
      return message || 'Ocurrió un error inesperado.';
  }
};

export function ErrorDisplay({
  title,
  message,
  description,
  status,
  onRetry,
  onGoHome,
  onGoBack,
  className,
  variant = 'default',
}: ErrorDisplayProps) {
  const errorTitle = getErrorTitle(status, title);
  const errorDescription = getErrorDescription(status, message, description);

  if (variant === 'minimal') {
    const ErrorIcon = getErrorIcon(status);
    const isConnectionError = !status || status === 0;

    return (
      <div className={cn('text-center py-8', className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <ErrorIcon className={cn(
            "h-6 w-6",
            isConnectionError ? "text-amber-600" : "text-amber-600"
          )} />
        </div>
        <p className="text-sm font-medium">{errorTitle}</p>
        <p className="text-xs text-muted-foreground mt-1">{errorDescription}</p>
      </div>
    );
  }

  if (variant === 'compact') {
    const ErrorIcon = getErrorIcon(status);
    const isConnectionError = !status || status === 0;

    return (
      <Card className={cn('shadow-sm border-0', className)}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 flex-shrink-0">
              <ErrorIcon className={cn(
                "h-5 w-5",
                isConnectionError ? "text-amber-600" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{errorTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{errorDescription}</p>
              {(onRetry || onGoBack || onGoHome) && (
                <div className="flex gap-2 mt-4">
                  {onRetry && (
                    <Button variant="default" size="sm" onClick={onRetry}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  )}
                  {onGoBack && (
                    <Button variant="outline" size="sm" onClick={onGoBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver
                    </Button>
                  )}
                  {onGoHome && (
                    <Button variant="ghost" size="sm" onClick={onGoHome}>
                      <Home className="h-4 w-4 mr-2" />
                      Inicio
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ErrorIcon = getErrorIcon(status);
  const isConnectionError = !status || status === 0;

  return (
    <div className={cn('min-h-screen flex items-center justify-center px-4 py-8', className)}>
      <Card className="w-full max-w-md shadow-sm border-0">
        <CardHeader className="text-center space-y-6 pt-8 pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <ErrorIcon className={cn(
              "h-8 w-8",
              isConnectionError ? "text-amber-600" : "text-amber-600"
            )} />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-2xl font-semibold">{errorTitle}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {errorDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-8">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="default"
              size="lg"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
          {onGoBack && (
            <Button
              onClick={onGoBack}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          )}
          {onGoHome && (
            <Button
              onClick={onGoHome}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
