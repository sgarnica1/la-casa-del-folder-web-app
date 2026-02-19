import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@/components/ui';
import { EditorCanvas } from './EditorCanvas';
import { EditorToolbar } from './EditorToolbar';
import { QualityIndicator } from './QualityIndicator';
import type { ImageTransform } from '@/types/photo-editor';

interface PhotoEditorProps {
  imageId: string;
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  cropWidth: number;
  cropHeight: number;
  aspectRatio: number;
  initialTransform?: Partial<ImageTransform>;
  onSave: (transform: ImageTransform) => void;
  onCancel: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
}

export function PhotoEditor({
  imageId,
  imageUrl,
  originalWidth,
  originalHeight,
  cropWidth,
  cropHeight,
  aspectRatio,
  initialTransform,
  onSave,
  onCancel,
  onReplace,
  onDelete,
}: PhotoEditorProps) {
  const [transform, setTransform] = useState<ImageTransform>(() => {
    const imgAspect = originalWidth / originalHeight;
    const cropAspect = cropWidth / cropHeight;
    let initialScale = 1;
    if (imgAspect > cropAspect) {
      initialScale = cropHeight / originalHeight;
    } else {
      initialScale = cropWidth / originalWidth;
    }

    const initialState = {
      imageId,
      originalWidth,
      originalHeight,
      scale: initialTransform?.scale ?? initialScale,
      rotation: initialTransform?.rotation ?? 0,
      offsetX: initialTransform?.offsetX ?? 0,
      offsetY: initialTransform?.offsetY ?? 0,
      cropWidth,
      cropHeight,
    };

    return initialState;
  });

  const [showGrid, setShowGrid] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTransform) {
      setTransform((prev) => {
        const updatedTransform = {
          ...prev,
          ...initialTransform,
          imageId,
          originalWidth,
          originalHeight,
          cropWidth,
          cropHeight,
        };
        return updatedTransform;
      });
    }
  }, [imageId, originalWidth, originalHeight, cropWidth, cropHeight, initialTransform]);

  const handleTransformChange = useCallback((updates: Partial<ImageTransform>) => {
    setTransform((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleRotate = useCallback(() => {
    setTransform((prev) => {
      const newRotation = (prev.rotation + 90) % 360;
      const rotationRad = (newRotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotationRad));
      const sin = Math.abs(Math.sin(rotationRad));

      const rotatedWidth = originalWidth * cos + originalHeight * sin;
      const rotatedHeight = originalWidth * sin + originalHeight * cos;

      const imgAspect = rotatedWidth / rotatedHeight;
      const cropAspect = cropWidth / cropHeight;

      let minScale = 1;
      if (imgAspect > cropAspect) {
        minScale = cropHeight / rotatedHeight;
      } else {
        minScale = cropWidth / rotatedWidth;
      }

      const newScale = Math.max(minScale, prev.scale);

      return {
        ...prev,
        rotation: newRotation,
        scale: newScale,
        offsetX: 0,
        offsetY: 0,
      };
    });
  }, [originalWidth, originalHeight, cropWidth, cropHeight]);

  const handleZoomIn = useCallback(() => {
    setTransform((prev) => {
      const newScale = Math.min(3, prev.scale * 1.1);
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => {
      const imgAspect = originalWidth / originalHeight;
      const cropAspect = cropWidth / cropHeight;
      let minScale = 1;
      if (imgAspect > cropAspect) {
        minScale = cropHeight / originalHeight;
      } else {
        minScale = cropWidth / originalWidth;
      }
      const newScale = Math.max(minScale, prev.scale * 0.9);
      return { ...prev, scale: newScale };
    });
  }, [originalWidth, originalHeight, cropWidth, cropHeight]);

  const handleFill = useCallback(() => {
    setTransform((prev) => {
      const rotationRad = (prev.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotationRad));
      const sin = Math.abs(Math.sin(rotationRad));

      const rotatedWidth = originalWidth * cos + originalHeight * sin;
      const rotatedHeight = originalWidth * sin + originalHeight * cos;

      // Use effective 3:2 frame — same as constrainPosition and EditorCanvas rendering
      const targetAR = 3 / 2;
      const cropAR = cropWidth / cropHeight;
      const effectiveCropW = cropAR > targetAR ? cropWidth : cropHeight * targetAR;
      const effectiveCropH = effectiveCropW / targetAR;

      const imgAspect = rotatedWidth / rotatedHeight;
      const frameAspect = effectiveCropW / effectiveCropH;
      let minScale = 1;
      if (imgAspect > frameAspect) {
        minScale = effectiveCropH / rotatedHeight;
      } else {
        minScale = effectiveCropW / rotatedWidth;
      }
      return {
        ...prev,
        scale: minScale,
        offsetX: 0,
        offsetY: 0,
      };
    });
  }, [originalWidth, originalHeight, cropWidth, cropHeight]);

  const handleFit = useCallback(() => {
    setTransform((prev) => {
      const rotationRad = (prev.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotationRad));
      const sin = Math.abs(Math.sin(rotationRad));

      const rotatedWidth = originalWidth * cos + originalHeight * sin;
      const rotatedHeight = originalWidth * sin + originalHeight * cos;

      // Fit within the effective 3:2 display frame (matching what user sees in editor)
      const targetAR = 3 / 2;
      const cropAR = cropWidth / cropHeight;
      let effectiveCropW: number, effectiveCropH: number;
      if (cropAR > targetAR) {
        effectiveCropW = cropWidth;
        effectiveCropH = cropWidth / targetAR;
      } else {
        effectiveCropH = cropHeight;
        effectiveCropW = cropHeight * targetAR;
      }

      const imgAspect = rotatedWidth / rotatedHeight;
      const frameAspect = effectiveCropW / effectiveCropH;
      let fitScale = 1;
      if (imgAspect > frameAspect) {
        fitScale = effectiveCropW / rotatedWidth;
      } else {
        fitScale = effectiveCropH / rotatedHeight;
      }
      return {
        ...prev,
        scale: fitScale,
        offsetX: 0,
        offsetY: 0,
      };
    });
  }, [originalWidth, originalHeight, cropWidth, cropHeight]);

  const handleReplace = useCallback(() => {
    // Just trigger file input, don't close modal
    fileInputRef.current?.click();
  }, []);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete?.();
  }, [onDelete]);

  const constrainTransform = useCallback((t: ImageTransform) => {
    const rotationRad = (t.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));

    const baseRotatedWidth = t.originalWidth * cos + t.originalHeight * sin;
    const baseRotatedHeight = t.originalWidth * sin + t.originalHeight * cos;
    const rotatedAspect = baseRotatedWidth / baseRotatedHeight;

    let minScaleToCover: number;
    if (rotatedAspect > cropWidth / cropHeight) {
      minScaleToCover = cropHeight / baseRotatedHeight;
    } else {
      minScaleToCover = cropWidth / baseRotatedWidth;
    }

    if (t.scale <= minScaleToCover * 1.0001) {
      return { ...t, offsetX: 0, offsetY: 0 };
    }

    // Use effective crop dimensions matching the 3:2 editor display frame
    const targetAR = 3 / 2;
    const cropAR = cropWidth / cropHeight;
    let effectiveCropW: number, effectiveCropH: number;
    if (cropAR > targetAR) {
      effectiveCropW = cropWidth;
      effectiveCropH = cropWidth / targetAR;
    } else {
      effectiveCropH = cropHeight;
      effectiveCropW = cropHeight * targetAR;
    }

    const normalizedScale = t.scale / minScaleToCover;
    const originalAspect = t.originalWidth / t.originalHeight;
    const frameAspect = effectiveCropW / effectiveCropH;

    let baseImageW: number, baseImageH: number;
    if (originalAspect > frameAspect) {
      baseImageH = effectiveCropH;
      baseImageW = effectiveCropH * originalAspect;
    } else {
      baseImageW = effectiveCropW;
      baseImageH = effectiveCropW / originalAspect;
    }

    const scaledW = baseImageW * normalizedScale;
    const scaledH = baseImageH * normalizedScale;
    const maxX = (scaledW - effectiveCropW) / 2;
    const maxY = (scaledH - effectiveCropH) / 2;

    if (maxX < 0.001 || maxY < 0.001) {
      return { ...t, offsetX: 0, offsetY: 0 };
    }

    return {
      ...t,
      offsetX: Math.max(-maxX, Math.min(maxX, t.offsetX)),
      offsetY: Math.max(-maxY, Math.min(maxY, t.offsetY)),
    };
  }, [cropWidth, cropHeight]);

  const handleSave = useCallback(() => {
    onSave(constrainTransform(transform));
  }, [transform, constrainTransform, onSave]);

  return (
    <div className="flex flex-col h-full md:rounded-2xl">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onCancel}
        >
          <X className="h-5 w-5" />
        </Button>
        <DialogTitle className="text-lg font-semibold">Editar foto</DialogTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={handleSave}
        >
          <Check className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop Header */}
      <DialogHeader className="hidden md:flex flex-row items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <DialogTitle className="text-xl font-semibold">Editar foto</DialogTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </DialogHeader>

      {/* Mobile Quality Bar */}
      <div className="md:hidden px-4 py-2 bg-gray-100 flex-shrink-0">
        <QualityIndicator
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          scale={transform.scale}
          cropWidth={cropWidth}
          cropHeight={cropHeight}
        />
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0 rounded-2xl">
        <div
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              el.setAttribute('data-width', rect.width.toString());
              el.setAttribute('data-height', rect.height.toString());
            }
          }}
          className="flex-1 flex items-center justify-center bg-gray-50 p-2 md:p-4 min-h-0 overflow-auto"
        >
          <EditorCanvas
            imageUrl={imageUrl}
            transform={transform}
            cropWidth={cropWidth}
            cropHeight={cropHeight}
            aspectRatio={aspectRatio}
            showGrid={showGrid}
            onTransformChange={handleTransformChange}
          />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-96 border-l bg-white flex-col max-h-[calc(95vh-80px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <QualityIndicator
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              scale={transform.scale}
              cropWidth={cropWidth}
              cropHeight={cropHeight}
            />
            <EditorToolbar
              showGrid={showGrid}
              onRotate={handleRotate}
              onToggleGrid={() => setShowGrid((prev) => !prev)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReplace={handleReplace}
              onDelete={handleDelete}
              onFill={handleFill}
              onFit={handleFit}
            />
          </div>

          <div className="border-t p-6 flex gap-3">
            <Button onClick={handleSave} className="flex-[2]" size="lg">
              Guardar
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1 hover:bg-gray-50 hover:text-gray-900" size="lg">
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Toolbar */}
      <div className="md:hidden bg-white border-t px-4 py-3 flex-shrink-0">
        <EditorToolbar
          showGrid={showGrid}
          onRotate={handleRotate}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReplace={handleReplace}
          onDelete={handleDelete}
          onFill={handleFill}
          onFit={handleFit}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            // If onReplace is provided, call it (it will handle the upload)
            // Otherwise, the file input is just for triggering the upload UI
            if (onReplace) {
              onReplace();
            }
            // Reset the input so the same file can be selected again
            e.target.value = '';
          }
        }}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar imagen</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
