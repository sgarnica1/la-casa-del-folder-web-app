import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import type { Draft, Layout, LayoutItem } from '@/types';

export function EditorPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  const autoAssignRef = useRef(false);

  useEffect(() => {
    if (!draftId) return;

    autoAssignRef.current = false;

    const loadData = async () => {
      try {
        console.log('[EditorPage] Loading data for draft', { draftId });
        const [draftData, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);

        console.log('[EditorPage] Data loaded', {
          draftId: draftData.id,
          layoutItemsCount: draftData.layoutItems.length,
          layoutSlotsCount: layoutData.slots.length,
          layoutSlots: layoutData.slots.map(s => ({ id: s.id, name: s.name })),
        });

        setDraft(draftData);
        setLayout(layoutData);

        const imageIds = draftData.layoutItems
          .map((item) => item.imageId)
          .filter((id): id is string => {
            // Filter out null, undefined, empty strings, and validate UUID format
            if (!id || typeof id !== 'string') return false;
            // Basic UUID validation (8-4-4-4-12 hex format)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValid = uuidRegex.test(id);
            if (!isValid) {
              console.warn('[EditorPage] Invalid UUID format', { imageId: id });
            }
            return isValid;
          });

        console.log('[EditorPage] Valid image IDs', {
          count: imageIds.length,
          imageIds,
        });

        if (imageIds.length > 0 && uploadedImages.length === 0) {
          console.log('[EditorPage] Fetching images by IDs');
          const images = await apiClient.getImagesByIds(imageIds);
          console.log('[EditorPage] Images fetched', { count: images.length });
          addImages(images);
        }
      } catch (err) {
        console.error('[EditorPage] Error loading data', err);
        toast.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [draftId, addImages, uploadedImages.length, toast]);

  useEffect(() => {
    if (!draft || !layout || !draftId || uploadedImages.length === 0 || autoAssignRef.current || isLoading) return;

    const hasUnassignedImages = uploadedImages.some(
      (img) => !draft.layoutItems.some((item) => item.imageId === img.id)
    );

    if (!hasUnassignedImages) {
      autoAssignRef.current = true;
      return;
    }

    autoAssignRef.current = true;

    const autoAssign = async () => {
      // Sort slots properly: cover first, then by month number
      const sortedSlots = [...layout.slots].sort((a, b) => {
        const aIsCover = a.name.toLowerCase().includes('portada') || a.name.toLowerCase().includes('cover');
        const bIsCover = b.name.toLowerCase().includes('portada') || b.name.toLowerCase().includes('cover');

        if (aIsCover && !bIsCover) return -1;
        if (!aIsCover && bIsCover) return 1;

        const aMatch = a.name.match(/(?:slot|mes|month)\s*(\d+)/i);
        const bMatch = b.name.match(/(?:slot|mes|month)\s*(\d+)/i);

        if (aMatch && bMatch) {
          return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
        }

        return a.name.localeCompare(b.name);
      });

      const unassignedImages = uploadedImages.filter(
        (img) => !draft.layoutItems.some((item) => item.imageId === img.id)
      );

      // Get slots that don't have images assigned yet
      const unassignedSlots = sortedSlots.filter(
        (slot) => !draft.layoutItems.some((item) => item.slotId === slot.id && item.imageId)
      );

      // Build updated items: keep existing items, update unassigned ones
      const updatedItems: LayoutItem[] = draft.layoutItems.map((item) => ({ ...item }));

      // Only assign to unassigned slots, in order
      for (let i = 0; i < Math.min(unassignedImages.length, unassignedSlots.length); i++) {
        const slot = unassignedSlots[i];
        const image = unassignedImages[i];

        // Find existing layoutItem for this slot, or use a placeholder UUID structure
        const existingItem = updatedItems.find((item) => item.slotId === slot.id);
        if (existingItem) {
          // Update existing item
          existingItem.imageId = image.id;
        } else {
          // This shouldn't happen if draft was created correctly, but handle it
          console.warn('[EditorPage] No existing layoutItem for slot', { slotId: slot.id });
          // Use the slot ID to generate a deterministic UUID-like structure
          // For now, skip items that don't exist in draft
        }
      }

      console.log('[EditorPage] Auto-assigning images', {
        unassignedImagesCount: unassignedImages.length,
        unassignedSlotsCount: unassignedSlots.length,
        updatedItemsCount: updatedItems.length,
        updatedItems: updatedItems.map(item => ({ id: item.id, slotId: item.slotId, hasImageId: !!item.imageId })),
      });

      try {
        setIsSaving(true);
        const updatedDraft = await apiClient.updateDraft(draftId, {
          layoutItems: updatedItems,
        });
        console.log('[EditorPage] Auto-assign successful', { layoutItemsCount: updatedDraft.layoutItems.length });
        setDraft(updatedDraft);
      } catch (err) {
        console.error('Failed to auto-assign images:', err);
        toast.error(err);
      } finally {
        setIsSaving(false);
      }
    };

    autoAssign();
  }, [draft, layout, uploadedImages, draftId, isLoading, toast]);


  const handleContinue = () => {
    if (draftId) {
      navigate(`/draft/${draftId}/preview`);
    }
  };

  const handleBack = () => {
    if (draftId) {
      navigate(`/draft/${draftId}/upload`);
    }
  };

  const handleSlotClick = () => {
    // TODO: Implement image assignment functionality
  };

  const [titleValue, setTitleValue] = useState<string>('Título del calendario');
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (draft?.title !== undefined) {
      setTitleValue(draft.title || 'Título del calendario');
    }
  }, [draft?.title]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!draft || !draftId) return;

    setTitleValue(newTitle);

    // Clear previous timeout
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }

    // Debounce the save operation
    titleSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const updatedDraft = await apiClient.updateDraft(draftId, {
          title: newTitle || 'Título del calendario',
        });
        setDraft(updatedDraft);
        console.log('[EditorPage] Title updated', { title: newTitle });
      } catch (err) {
        console.error('[EditorPage] Failed to update title', err);
        toast.error(err);
        // Revert on error
        setTitleValue(draft.title || 'Título del calendario');
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [draft, draftId, toast]);

  if (isLoading) {
    return (
      <>
        <DraftEditorHeader />
        <div className="w-full bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-6">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="space-y-12">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!draft || !layout) {
    return (
      <>
        <DraftEditorHeader />
        <div className="container mx-auto px-4 py-8">
          <p>Error: No se pudo cargar el borrador</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DraftEditorHeader
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel={isSaving ? 'Guardando...' : 'Continuar a Vista Previa'}
        continueDisabled={isSaving}
      />
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Título del calendario</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Haz clic en una imagen para cambiarla
            </p>
          </div>
          <CalendarEditor
            layout={layout}
            layoutItems={draft.layoutItems}
            images={uploadedImages}
            year={2026}
            title={titleValue}
            onSlotClick={handleSlotClick}
            onTitleChange={handleTitleChange}
          />
        </div>
      </div>
    </>
  );
}
