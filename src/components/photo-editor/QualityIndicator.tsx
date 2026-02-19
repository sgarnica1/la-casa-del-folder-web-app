import { useMemo } from 'react';
import type { QualityMetrics } from '@/types/photo-editor';

interface QualityIndicatorProps {
  originalWidth: number;
  originalHeight: number;
  scale: number;
  cropWidth: number;
  cropHeight: number;
  printDpi?: number;
}

const PRINT_DPI = 300;

export function QualityIndicator({
  originalWidth,
  originalHeight,
  scale,
  cropWidth,
  cropHeight,
  printDpi = PRINT_DPI,
}: QualityIndicatorProps) {
  const metrics = useMemo<QualityMetrics>(() => {
    // Calculate quality based on:
    // 1. Original image dimensions (higher = better quality)
    // 2. Scale/zoom level (more zoom = less quality, because we're using less of the image)

    // Calculate the minimum scale needed to cover the crop
    const imgAspect = originalWidth / originalHeight;
    const cropAspect = cropWidth / cropHeight;
    let minScale: number;
    if (imgAspect > cropAspect) {
      minScale = cropHeight / originalHeight;
    } else {
      minScale = cropWidth / originalWidth;
    }

    // The actual scale relative to minimum (1.0 = covers crop, >1.0 = zoomed in)
    const relativeScale = scale / minScale;

    // More zoom (higher relativeScale) means we're using less of the original image
    // So quality decreases as we zoom in
    // Quality factor: 1.0 at minScale, decreases as scale increases
    const zoomQualityFactor = 1.0 / relativeScale;

    // Base quality on image resolution at a standard print size (6"×9" for calendar)
    const referencePrintWidth = 6; // inches
    const referencePrintHeight = 9; // inches
    const referenceAspect = referencePrintWidth / referencePrintHeight;

    let printWidth: number;
    let printHeight: number;
    if (imgAspect > referenceAspect) {
      printHeight = referencePrintHeight;
      printWidth = referencePrintHeight * imgAspect;
    } else {
      printWidth = referencePrintWidth;
      printHeight = referencePrintWidth / imgAspect;
    }

    // Base DPI from image resolution
    const baseDpiWidth = originalWidth / printWidth;
    const baseDpiHeight = originalHeight / printHeight;
    const baseDpi = Math.min(baseDpiWidth, baseDpiHeight);

    // Apply zoom quality factor (more zoom = less quality)
    const effectiveDpi = baseDpi * zoomQualityFactor;

    const resolution = `${Math.round(originalWidth)} × ${Math.round(originalHeight)}`;
    const printSize = `${printWidth.toFixed(2)}" × ${printHeight.toFixed(2)}"`;

    const recommendedDpi = printDpi;
    const recommendedMinimum = `${recommendedDpi} DPI`;

    let status: 'good' | 'acceptable' | 'low';
    if (effectiveDpi >= recommendedDpi * 0.9) {
      status = 'good';
    } else if (effectiveDpi >= recommendedDpi * 0.6) {
      status = 'acceptable';
    } else {
      status = 'low';
    }

    // Calculate quality score as a percentage of recommended DPI, capped at 10
    const qualityScore = Math.min(10, Math.max(0, Math.round((effectiveDpi / recommendedDpi) * 10)));

    return {
      effectiveDpi: Math.round(effectiveDpi),
      resolution,
      printSize,
      recommendedMinimum,
      status,
      qualityScore,
    };
  }, [originalWidth, originalHeight, scale, cropWidth, cropHeight, printDpi]);

  return (
    <div className="space-y-0 md:space-y-4">
      <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden">
        <div
          className="h-full bg-gray-400 transition-all duration-300 flex items-center px-4"
          style={{ width: `${(metrics.qualityScore / 10) * 100}%` }}
        >
          <span className="text-sm font-semibold text-black whitespace-nowrap">Calidad de impresión</span>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-700">
          {metrics.qualityScore}/10
        </div>
      </div>

      <div className="hidden md:block text-xs space-y-2 text-gray-600">
        <div className="flex flex-col items-start gap-2">
          <div><span className="font-medium">Escala:</span> {Math.round(scale * 100)}%</div>
          <div><span className="font-medium">Dimensiones:</span> {metrics.resolution}</div>
          <div><span className="font-medium">Origen:</span> Dispositivo</div>
        </div>
      </div>
    </div>
  );
}
