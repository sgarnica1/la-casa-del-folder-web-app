/**
 * Layout type - defines the structure of a product template
 * Mirrors backend Layout structure
 */

export interface Layout {
  id: string;
  templateId: string;
  slots: LayoutSlot[];
}

export interface LayoutSlot {
  id: string;
  name: string;
  required: boolean;
  bounds: Bounds;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
