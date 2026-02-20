import { useRef, useEffect, useState, useCallback } from 'react';
import type { PhotoEditorTransform } from '@/types/photo-editor';

interface EditorCanvasProps {
  imageUrl: string;
  transform: PhotoEditorTransform;
  cropWidth: number;
  cropHeight: number;
  aspectRatio?: number;
  showGrid: boolean;
  onTransformChange: (transform: Partial<PhotoEditorTransform>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function EditorCanvas({
  imageUrl,
  transform,
  cropWidth,
  cropHeight,
  aspectRatio: _aspectRatio,
  showGrid,
  onTransformChange,
  onDragStart,
  onDragEnd,
}: EditorCanvasProps) {
  void _aspectRatio;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTransform, setLastTransform] = useState({ offsetX: 0, offsetY: 0 });
  const [pinchStart, setPinchStart] = useState<{ distance: number; scale: number } | null>(null);
  const [displayDimensions, setDisplayDimensions] = useState({ width: 600, height: 400 });

  const minScale = useRef(1);
  const maxScale = 3;

  // Observe the canvas's own rendered size — no feedback loop
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          console.log('[EditorCanvas] Canvas self-observed size:', { width, height, aspectRatio: width / height });
          setDisplayDimensions({ width, height });
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;

    const rotationRad = (transform.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));

    const rotatedWidth = transform.originalWidth * cos + transform.originalHeight * sin;
    const rotatedHeight = transform.originalWidth * sin + transform.originalHeight * cos;

    const imgAspect = rotatedWidth / rotatedHeight;
    const cropAspect = cropWidth / cropHeight;

    // Calculate fit scale (contain) - the minimum scale to fit image within crop
    // This allows both "fit" (bg-contain) and "fill" (bg-cover) modes
    let fitScale = 1;
    if (imgAspect > cropAspect) {
      // Image is wider - fit to width
      fitScale = cropWidth / rotatedWidth;
    } else {
      // Image is taller - fit to height
      fitScale = cropHeight / rotatedHeight;
    }

    // Allow scale between fitScale (minimum) and maxScale
    minScale.current = fitScale;

    // Only enforce minimum if scale is below fit scale
    if (transform.scale < fitScale) {
      onTransformChange({ scale: fitScale });
    }
  }, [transform.originalWidth, transform.originalHeight, transform.rotation, transform.scale, cropWidth, cropHeight, onTransformChange]);

  const constrainPosition = useCallback((x: number, y: number, scale: number) => {
    const rotationRad = (transform.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));

    const baseRotatedWidth = transform.originalWidth * cos + transform.originalHeight * sin;
    const baseRotatedHeight = transform.originalWidth * sin + transform.originalHeight * cos;
    const rotatedAspect = baseRotatedWidth / baseRotatedHeight;

    // Effective 3:2 frame — must match rendering and handleFill/handleFit
    const targetAR = 3 / 2;
    const cropAR = cropWidth / cropHeight;
    const effectiveCropW = cropAR > targetAR ? cropWidth : cropHeight * targetAR;
    const effectiveCropH = effectiveCropW / targetAR;
    const frameAspect = effectiveCropW / effectiveCropH; // always 1.5

    // minScaleToCover uses effectiveCropW/H — same as rendering
    let minScaleToCover: number;
    if (rotatedAspect > frameAspect) {
      minScaleToCover = effectiveCropH / baseRotatedHeight;
    } else {
      minScaleToCover = effectiveCropW / baseRotatedWidth;
    }

    if (scale <= minScaleToCover * 1.0001) {
      return { x: 0, y: 0 };
    }

    const normalizedScale = scale / minScaleToCover;

    const originalAspect = transform.originalWidth / transform.originalHeight;
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
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [transform.originalWidth, transform.originalHeight, transform.rotation, cropWidth, cropHeight]);

  useEffect(() => {
    const constrained = constrainPosition(transform.offsetX, transform.offsetY, transform.scale);
    if (Math.abs(constrained.x - transform.offsetX) > 0.001 || Math.abs(constrained.y - transform.offsetY) > 0.001) {
      onTransformChange({ offsetX: constrained.x, offsetY: constrained.y });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transform.scale, transform.rotation, transform.originalWidth, transform.originalHeight, cropWidth, cropHeight, constrainPosition, onTransformChange]);


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setLastTransform({ offsetX: transform.offsetX, offsetY: transform.offsetY });
    onDragStart?.();
    e.preventDefault();
  }, [transform.offsetX, transform.offsetY, onDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const effW = (cropWidth / cropHeight) > (3 / 2) ? cropWidth : cropHeight * (3 / 2);
    const scaleFactor = displayDimensions.width / effW;
    const deltaX = (e.clientX - dragStart.x) / scaleFactor;
    const deltaY = (e.clientY - dragStart.y) / scaleFactor;

    const newX = lastTransform.offsetX + deltaX;
    const newY = lastTransform.offsetY + deltaY;

    const constrained = constrainPosition(newX, newY, transform.scale);
    onTransformChange({ offsetX: constrained.x, offsetY: constrained.y });
  }, [isDragging, dragStart, lastTransform, transform.scale, cropWidth, cropHeight, displayDimensions, constrainPosition, onTransformChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      const constrained = constrainPosition(transform.offsetX, transform.offsetY, transform.scale);
      if (Math.abs(constrained.x - transform.offsetX) > 0.001 || Math.abs(constrained.y - transform.offsetY) > 0.001) {
        onTransformChange({ offsetX: constrained.x, offsetY: constrained.y });
      }
      onDragEnd?.();
    }
  }, [isDragging, transform.offsetX, transform.offsetY, transform.scale, constrainPosition, onTransformChange, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.max(
      minScale.current,
      Math.min(maxScale, transform.scale * factor)
    );

    if (newScale !== transform.scale) {
      const constrained = constrainPosition(transform.offsetX, transform.offsetY, newScale);
      onTransformChange({ scale: newScale, offsetX: constrained.x, offsetY: constrained.y });
    }
  }, [transform.scale, transform.offsetX, transform.offsetY, constrainPosition, onTransformChange]);

  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setLastTransform({ offsetX: transform.offsetX, offsetY: transform.offsetY });
      setPinchStart(null);
      onDragStart?.();
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const distance = getTouchDistance(e.touches);
      setPinchStart({ distance, scale: transform.scale });
    }
  }, [transform.offsetX, transform.offsetY, transform.scale, getTouchDistance, onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const effW = (cropWidth / cropHeight) > (3 / 2) ? cropWidth : cropHeight * (3 / 2);
    const scaleFactor = displayDimensions.width / effW;

    if (e.touches.length === 2 && pinchStart) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scaleChange = distance / pinchStart.distance;
      const newScale = Math.max(
        minScale.current,
        Math.min(maxScale, pinchStart.scale * scaleChange)
      );

      if (newScale !== transform.scale) {
        const constrained = constrainPosition(transform.offsetX, transform.offsetY, newScale);
        onTransformChange({ scale: newScale, offsetX: constrained.x, offsetY: constrained.y });
      }
    } else if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = (touch.clientX - dragStart.x) / scaleFactor;
      const deltaY = (touch.clientY - dragStart.y) / scaleFactor;

      const newX = lastTransform.offsetX + deltaX;
      const newY = lastTransform.offsetY + deltaY;

      const constrained = constrainPosition(newX, newY, transform.scale);
      onTransformChange({
        offsetX: constrained.x,
        offsetY: constrained.y,
      });
    }
  }, [isDragging, dragStart, lastTransform, transform.scale, transform.offsetX, transform.offsetY, pinchStart, cropWidth, cropHeight, displayDimensions, getTouchDistance, constrainPosition, onTransformChange]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      const constrained = constrainPosition(transform.offsetX, transform.offsetY, transform.scale);
      if (Math.abs(constrained.x - transform.offsetX) > 0.001 || Math.abs(constrained.y - transform.offsetY) > 0.001) {
        onTransformChange({ offsetX: constrained.x, offsetY: constrained.y });
      }
      onDragEnd?.();
    }
    setPinchStart(null);
  }, [isDragging, transform.offsetX, transform.offsetY, transform.scale, constrainPosition, onTransformChange, onDragEnd]);

  const displayWidth = displayDimensions.width;
  const displayHeight = displayDimensions.height;

  // Effective 3:2 crop frame — must match constrainPosition
  const targetAR = 3 / 2;
  const cropAR = cropWidth / cropHeight;
  const effectiveCropW = cropAR > targetAR ? cropWidth : cropHeight * targetAR;
  const effectiveCropH = effectiveCropW / targetAR;

  // scaleFactor converts effective-crop-space units → display pixels
  const scaleFactor = displayWidth / effectiveCropW;

  const originalAspect = transform.originalWidth / transform.originalHeight;
  const frameAspect = displayWidth / displayHeight; // always 3:2

  const rotationRad = (transform.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));
  const rotatedWidth = transform.originalWidth * cos + transform.originalHeight * sin;
  const rotatedHeight = transform.originalWidth * sin + transform.originalHeight * cos;
  const rotatedAspect = rotatedWidth / rotatedHeight;

  // minScaleToCoverCrop uses effectiveCropW/H — same as constrainPosition
  let minScaleToCoverCrop: number;
  if (rotatedAspect > effectiveCropW / effectiveCropH) {
    minScaleToCoverCrop = effectiveCropH / rotatedHeight;
  } else {
    minScaleToCoverCrop = effectiveCropW / rotatedWidth;
  }

  let baseImageWidth: number;
  let baseImageHeight: number;

  if (originalAspect > frameAspect) {
    baseImageHeight = displayHeight;
    baseImageWidth = displayHeight * originalAspect;
  } else {
    baseImageWidth = displayWidth;
    baseImageHeight = displayWidth / originalAspect;
  }

  const normalizedScale = transform.scale / minScaleToCoverCrop;
  const scaledWidth = baseImageWidth * normalizedScale;
  const scaledHeight = baseImageHeight * normalizedScale;

  const imageStyle: React.CSSProperties = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    transform: `translate(${transform.offsetX * scaleFactor}px, ${transform.offsetY * scaleFactor}px) rotate(${transform.rotation}deg)`,
    transformOrigin: 'center center',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 overflow-hidden border border-gray-300 w-full"
      style={{ aspectRatio: '3/2' }}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          overflow: 'hidden',
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Editor"
          draggable={false}
          style={imageStyle}
          className="max-w-none"
        />
      </div>

      {showGrid && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <svg className="w-full h-full" style={{ opacity: 0.7 }}>
            <defs>
              <pattern
                id={`grid-h-${imageUrl.replace(/[^a-zA-Z0-9]/g, '-')}`}
                width="100%"
                height="33.333%"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="100%" y2="0" stroke="#14b8a6" strokeWidth="2" />
              </pattern>
              <pattern
                id={`grid-v-${imageUrl.replace(/[^a-zA-Z0-9]/g, '-')}`}
                width="33.333%"
                height="100%"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="100%" stroke="#14b8a6" strokeWidth="2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-h-${imageUrl.replace(/[^a-zA-Z0-9]/g, '-')})`} />
            <rect width="100%" height="100%" fill={`url(#grid-v-${imageUrl.replace(/[^a-zA-Z0-9]/g, '-')})`} />
          </svg>
        </div>
      )}

    </div>
  );
}

