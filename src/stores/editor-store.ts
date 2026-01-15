/**
 * Editor Store - manages editor state
 * This is a state machine for the editor
 * All state is serializable
 */

import { create } from 'zustand';
import type { EditorState, EditorActions, Draft, Layout, UploadedImage } from '@/types';

interface EditorStore extends EditorState, EditorActions {}

const initialState: EditorState = {
  draft: null,
  layout: null,
  selectedSlotId: null,
  selectedImageId: null,
  uploadedImages: [],
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...initialState,

  setDraft: (draft: Draft | null) => set({ draft }),

  setLayout: (layout: Layout | null) => set({ layout }),

  selectSlot: (slotId: string | null) => set({ selectedSlotId: slotId }),

  selectImage: (imageId: string | null) => set({ selectedImageId: imageId }),

  addUploadedImage: (image: UploadedImage) =>
    set((state) => ({
      uploadedImages: [...state.uploadedImages, image],
    })),

  removeUploadedImage: (imageId: string) =>
    set((state) => ({
      uploadedImages: state.uploadedImages.filter((img) => img.id !== imageId),
    })),

  assignImageToSlot: (slotId: string, imageId: string) => {
    // Placeholder - will be implemented later
    // This should update the draft's layoutItems
    set((state) => {
      if (!state.draft) return state;
      // TODO: Implement assignment logic
      return state;
    });
  },

  clearSelection: () =>
    set({
      selectedSlotId: null,
      selectedImageId: null,
    }),
}));
