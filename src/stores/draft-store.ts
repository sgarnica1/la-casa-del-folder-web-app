/**
 * Draft Store - manages draft data from backend
 * This store mirrors backend Draft state
 * Frontend NEVER calculates final prices or validates drafts
 */

import { create } from 'zustand';
import type { Draft } from '@/types';

interface DraftStore {
  currentDraft: Draft | null;
  setCurrentDraft: (draft: Draft | null) => void;
  isLoading: boolean;
  error: string | null;
}

export const useDraftStore = create<DraftStore>((set) => ({
  currentDraft: null,
  isLoading: false,
  error: null,

  setCurrentDraft: (draft: Draft | null) => set({ currentDraft: draft }),
}));
