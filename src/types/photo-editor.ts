export interface PhotoEditorTransform {
  imageId: string;
  originalWidth: number;
  originalHeight: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  cropWidth: number;
  cropHeight: number;
}

export interface QualityMetrics {
  effectiveDpi: number;
  resolution: string;
  printSize: string;
  recommendedMinimum: string;
  status: 'good' | 'acceptable' | 'low';
  qualityScore: number;
}
