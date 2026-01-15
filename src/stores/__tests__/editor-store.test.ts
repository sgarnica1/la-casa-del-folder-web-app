/**
 * Editor Store Tests - example test structure
 * Tests for editor state logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editor-store';

describe('EditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorStore.setState({
      draft: null,
      layout: null,
      selectedSlotId: null,
      selectedImageId: null,
      uploadedImages: [],
    });
  });

  it('should initialize with default state', () => {
    const state = useEditorStore.getState();
    expect(state.draft).toBeNull();
    expect(state.layout).toBeNull();
    expect(state.selectedSlotId).toBeNull();
    expect(state.selectedImageId).toBeNull();
    expect(state.uploadedImages).toEqual([]);
  });

  it('should set draft', () => {
    const mockDraft = {
      id: 'draft-1',
      status: 'draft' as const,
      productId: 'product-1',
      templateId: 'template-1',
      layoutItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useEditorStore.getState().setDraft(mockDraft);
    const state = useEditorStore.getState();
    expect(state.draft).toEqual(mockDraft);
  });

  it('should clear selection', () => {
    useEditorStore.setState({
      selectedSlotId: 'slot-1',
      selectedImageId: 'image-1',
    });

    useEditorStore.getState().clearSelection();
    const state = useEditorStore.getState();
    expect(state.selectedSlotId).toBeNull();
    expect(state.selectedImageId).toBeNull();
  });
});
