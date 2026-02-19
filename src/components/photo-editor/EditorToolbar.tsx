import { RotateCw, Grid, Image, Trash2, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface EditorToolbarProps {
  showGrid: boolean;
  onRotate: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReplace: () => void;
  onDelete: () => void;
  onFill: () => void;
  onFit: () => void;
  disabled?: boolean;
}

export function EditorToolbar({
  showGrid,
  onRotate,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  onReplace,
  onDelete,
  onFill,
  onFit,
  disabled = false,
}: EditorToolbarProps) {
  return (
    <div className="flex md:grid md:grid-cols-4 gap-2 overflow-x-auto md:overflow-visible">
      <Button
        variant="outline"
        onClick={onFill}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <Maximize2 className="h-5 w-5 mb-1" />
        <span className="text-xs">Completar</span>
      </Button>
      <Button
        variant="outline"
        onClick={onFit}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <Minimize2 className="h-5 w-5 mb-1" />
        <span className="text-xs">Ajustar</span>
      </Button>
      <Button
        variant="outline"
        onClick={onZoomIn}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <ZoomIn className="h-5 w-5 mb-1" />
        <span className="text-xs">Ampliar</span>
      </Button>
      <Button
        variant="outline"
        onClick={onZoomOut}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <ZoomOut className="h-5 w-5 mb-1" />
        <span className="text-xs">Alejarse</span>
      </Button>
      <Button
        variant="outline"
        onClick={onRotate}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <RotateCw className="h-5 w-5 mb-1" />
        <span className="text-xs">Rotar</span>
      </Button>
      <Button
        variant="outline"
        onClick={onToggleGrid}
        disabled={disabled}
        className={`flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-100 text-black hover:text-black ${showGrid ? 'bg-gray-100' : ''}`}
      >
        <Grid className="h-5 w-5 mb-1" />
        <span className="text-xs">Cuadrícula</span>
      </Button>
      <Button
        variant="outline"
        onClick={onReplace}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-gray-300 bg-white hover:bg-gray-50 text-black hover:text-black"
      >
        <Image className="h-5 w-5 mb-1" />
        <span className="text-xs">Cambiar</span>
      </Button>
      <Button
        variant="outline"
        onClick={onDelete}
        disabled={disabled}
        className="flex flex-col items-center justify-center h-20 w-20 md:w-auto flex-shrink-0 p-2 border border-red-200 bg-red-50 hover:bg-red-100 text-black hover:text-black"
      >
        <Trash2 className="h-5 w-5 mb-1" />
        <span className="text-xs">Eliminar</span>
      </Button>
    </div>
  );
}
