import { ReactNode } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface DraftEditorHeaderProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  backDisabled?: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  children?: ReactNode;
}

export function DraftEditorHeader({
  onBack,
  onContinue,
  continueLabel = 'Continuar',
  continueDisabled = false,
  backDisabled = false,
  isSaving = false,
  isSaved = false,
  children,
}: DraftEditorHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={backDisabled}
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {children}
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span>Guardando...</span>
            </div>
          )}
          {isSaved && !isSaving && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Guardado</span>
            </div>
          )}
          {onContinue && (
            <Button
              onClick={onContinue}
              disabled={continueDisabled}
              size="lg"
              className={`h-11 px-6 rounded-xl font-semibold transition-all duration-180 ${continueDisabled
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                }`}
            >
              {continueLabel}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
