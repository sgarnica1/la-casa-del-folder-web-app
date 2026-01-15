/**
 * EditorState type - defines the editor's internal state
 * This is serializable and testable
 */

import type { Draft } from './draft';
import type { Layout } from './layout';

export interface EditorState {
  draft: Draft | null;
  layout: Layout | null;
  selectedSlotId: string | null;
  selectedImageId: string | null;
  uploadedImages: UploadedImage[];
}

export interface UploadedImage {
  id: string;
  url: string;
}

export interface EditorActions {
  setDraft: (draft: Draft | null) => void;
  setLayout: (layout: Layout | null) => void;
  selectSlot: (slotId: string | null) => void;
  selectImage: (imageId: string | null) => void;
  addUploadedImage: (image: UploadedImage) => void;
  removeUploadedImage: (imageId: string) => void;
  assignImageToSlot: (slotId: string, imageId: string) => void;
  clearSelection: () => void;
}
