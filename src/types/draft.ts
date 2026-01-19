/**
 * Core Draft type - mirrors backend Draft state
 * This is the source of truth for draft data structure
 */

export type DraftStatus = 'draft' | 'locked' | 'ordered';

export interface Draft {
  id: string;
  status: DraftStatus;
  productId: string;
  templateId: string;
  title?: string;
  layoutItems: LayoutItem[];
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
}

export interface LayoutItem {
  id: string;
  slotId: string;
  imageId?: string;
  transform?: ImageTransform;
}

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}
