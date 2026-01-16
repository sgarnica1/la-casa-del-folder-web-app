import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div>
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold mt-4">Página no encontrada</h2>
          <p className="text-muted-foreground mt-2">
            La página que buscas no existe o ha sido movida.
          </p>
        </div>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
