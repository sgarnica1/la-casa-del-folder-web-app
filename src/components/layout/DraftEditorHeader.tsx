import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

interface DraftEditorHeaderProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  backDisabled?: boolean;
  children?: ReactNode;
}

export function DraftEditorHeader({
  onBack,
  onContinue,
  continueLabel = 'Continuar',
  continueDisabled = false,
  backDisabled = false,
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
        {onContinue && (
          <Button
            onClick={onContinue}
            disabled={continueDisabled}
            size="lg"
          >
            {continueLabel}
          </Button>
        )}
      </div>
    </header>
  );
}
