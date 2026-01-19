import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { CheckCircle2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';

export function PaymentConfirmedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold">¡Pago Confirmado!</h1>
            <p className="text-muted-foreground">
              Tu pedido ha sido procesado exitosamente
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              {orderId && (
                <div>
                  <p className="text-sm text-muted-foreground">ID de Pedido</p>
                  <p className="font-mono text-lg font-semibold">{orderId}</p>
                </div>
              )}
              <p className="text-muted-foreground">
                Recibirás un correo de confirmación con los detalles de tu pedido.
              </p>
              <p className="text-sm text-muted-foreground">
                Te contactaremos pronto con más información sobre el envío.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/product/calendar')}
              size="lg"
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
