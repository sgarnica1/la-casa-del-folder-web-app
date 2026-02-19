import { useRef, useEffect, useState, useCallback } from 'react';
import type { ImageTransform } from '@/types/photo-editor';

interface EditorCanvasProps {
  imageUrl: string;
  transform: ImageTransform;
  cropWidth: number;
  cropHeight: number;
  aspectRatio?: number;
  showGrid: boolean;
  onTransformChange: (transform: Partial<ImageTransform>) => void;
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const minScale = useRef(1);
  const maxScale = 3;
  const maxDisplayWidth = 2400;
  const maxDisplayHeight = 1800;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const parent = containerRef.current.closest('.flex-1');
        if (parent) {
          const rect = parent.getBoundingClientRect();
          setContainerSize({
            width: Math.max(rect.width - 32, 400),
            height: Math.max(rect.height - 32, 400)
          });
        }
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
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

    let minScaleToCover: number;
    if (rotatedAspect > cropWidth / cropHeight) {
      minScaleToCover = cropHeight / baseRotatedHeight;
    } else {
      minScaleToCover = cropWidth / baseRotatedWidth;
    }

    if (scale <= minScaleToCover * 1.0001) {
      return { x: 0, y: 0 };
    }

    // Compute display dimensions exactly as the render body does
    const availableW = containerSize.width > 0 ? containerSize.width : maxDisplayWidth;
    const availableH = containerSize.height > 0 ? containerSize.height : maxDisplayHeight;
    const targetAR = 3 / 2;
    const cropAR = cropWidth / cropHeight;

    let displayW: number, displayH: number;
    if (cropAR > targetAR) {
      displayH = Math.min(availableH, maxDisplayHeight);
      displayW = displayH * targetAR;
    } else {
      displayW = Math.min(availableW, maxDisplayWidth);
      displayH = displayW / targetAR;
    }

    const scaleFactor = Math.min(displayW / cropWidth, displayH / cropHeight);
    const normalizedScale = scale / minScaleToCover;

    const originalAspect = transform.originalWidth / transform.originalHeight;
    const frameAspect = displayW / displayH;

    let baseImageW: number, baseImageH: number;
    if (originalAspect > frameAspect) {
      baseImageH = displayH;
      baseImageW = displayH * originalAspect;
    } else {
      baseImageW = displayW;
      baseImageH = displayW / originalAspect;
    }

    const scaledW_px = baseImageW * normalizedScale;
    const scaledH_px = baseImageH * normalizedScale;

    // Max offset in display pixels, then convert to crop units
    const maxX = (scaledW_px - displayW) / (2 * scaleFactor);
    const maxY = (scaledH_px - displayH) / (2 * scaleFactor);

    if (maxX < 0.001 || maxY < 0.001) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [transform.originalWidth, transform.originalHeight, transform.rotation, cropWidth, cropHeight, containerSize]);

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

    // Calculate the actual display dimensions
    const availableWidth = containerSize.width > 0 ? containerSize.width : maxDisplayWidth;
    const availableHeight = containerSize.height > 0 ? containerSize.height : maxDisplayHeight;
    const targetAspectRatio = 3 / 2;
    const cropAspectRatio = cropWidth / cropHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (cropAspectRatio > targetAspectRatio) {
      displayHeight = Math.min(availableHeight, maxDisplayHeight);
      displayWidth = displayHeight * targetAspectRatio;
    } else {
      displayWidth = Math.min(availableWidth, maxDisplayWidth);
      displayHeight = displayWidth / targetAspectRatio;
    }

    const scaleFactor = Math.min(
      displayWidth / cropWidth,
      displayHeight / cropHeight
    );

    const deltaX = (e.clientX - dragStart.x) / scaleFactor;
    const deltaY = (e.clientY - dragStart.y) / scaleFactor;

    const newX = lastTransform.offsetX + deltaX;
    const newY = lastTransform.offsetY + deltaY;

    const constrained = constrainPosition(newX, newY, transform.scale);
    onTransformChange({ offsetX: constrained.x, offsetY: constrained.y });
  }, [isDragging, dragStart, lastTransform, transform.scale, cropWidth, cropHeight, containerSize, maxDisplayWidth, maxDisplayHeight, constrainPosition, onTransformChange]);

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
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(
      minScale.current,
      Math.min(maxScale, transform.scale + delta)
    );

    if (newScale !== transform.scale) {
      const constrained = constrainPosition(transform.offsetX, transform.offsetY, newScale);
      onTransformChange({ scale: newScale, offsetX: constrained.x, offsetY: constrained.y });
    }
  }, [transform.scale, transform.offsetX, transform.offsetY, cropWidth, cropHeight, constrainPosition, onTransformChange]);

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
    // Calculate the actual display dimensions
    const availableWidth = containerSize.width > 0 ? containerSize.width : maxDisplayWidth;
    const availableHeight = containerSize.height > 0 ? containerSize.height : maxDisplayHeight;
    const targetAspectRatio = 3 / 2;
    const cropAspectRatio = cropWidth / cropHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (cropAspectRatio > targetAspectRatio) {
      displayHeight = Math.min(availableHeight, maxDisplayHeight);
      displayWidth = displayHeight * targetAspectRatio;
    } else {
      displayWidth = Math.min(availableWidth, maxDisplayWidth);
      displayHeight = displayWidth / targetAspectRatio;
    }

    const scaleFactor = Math.min(
      displayWidth / cropWidth,
      displayHeight / cropHeight
    );

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
  }, [isDragging, dragStart, lastTransform, transform.scale, transform.offsetX, transform.offsetY, pinchStart, cropWidth, cropHeight, containerSize, maxDisplayWidth, maxDisplayHeight, getTouchDistance, constrainPosition, onTransformChange]);

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

  const availableWidth = containerSize.width > 0 ? containerSize.width : maxDisplayWidth;
  const availableHeight = containerSize.height > 0 ? containerSize.height : maxDisplayHeight;

  const targetAspectRatio = 3 / 2;
  const cropAspectRatio = cropWidth / cropHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (cropAspectRatio > targetAspectRatio) {
    displayHeight = Math.min(availableHeight, maxDisplayHeight);
    displayWidth = displayHeight * targetAspectRatio;
  } else {
    displayWidth = Math.min(availableWidth, maxDisplayWidth);
    displayHeight = displayWidth / targetAspectRatio;
  }

  const scaleFactor = Math.min(
    displayWidth / cropWidth,
    displayHeight / cropHeight
  );

  // Calculate image size to cover the entire 3:2 frame
  // The image should be sized to fill the display area completely
  const originalAspect = transform.originalWidth / transform.originalHeight;
  const frameAspect = displayWidth / displayHeight;

  // Calculate what the minimum scale should be to cover the crop area
  // This is used to normalize the transform.scale value
  const rotationRad = (transform.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rotationRad));
  const sin = Math.abs(Math.sin(rotationRad));
  const rotatedWidth = transform.originalWidth * cos + transform.originalHeight * sin;
  const rotatedHeight = transform.originalWidth * sin + transform.originalHeight * cos;
  const rotatedAspect = rotatedWidth / rotatedHeight;

  let minScaleToCoverCrop: number;
  if (rotatedAspect > cropWidth / cropHeight) {
    minScaleToCoverCrop = cropHeight / rotatedHeight;
  } else {
    minScaleToCoverCrop = cropWidth / rotatedWidth;
  }

  // Calculate the base size needed to cover the frame at scale=1
  let baseImageWidth: number;
  let baseImageHeight: number;

  if (originalAspect > frameAspect) {
    // Image is wider than frame - make height match frame height
    baseImageHeight = displayHeight;
    baseImageWidth = displayHeight * originalAspect;
  } else {
    // Image is taller than frame - make width match frame width  
    baseImageWidth = displayWidth;
    baseImageHeight = displayWidth / originalAspect;
  }

  // Normalize the scale: transform.scale is relative to minScaleToCoverCrop
  // We want scale=1 to mean "covers the frame", so we normalize it
  const normalizedScale = transform.scale / minScaleToCoverCrop;

  // Apply the normalized scale to the base size
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
      className="relative bg-gray-100 overflow-hidden border border-gray-300"
      style={{
        width: displayWidth,
        height: displayHeight,
        aspectRatio: '3/2',
      }}
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
