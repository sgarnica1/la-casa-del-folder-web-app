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
  const [uploadingSlots, setUploadingSlots] = useState<Map<string, { previewUrl: string }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentReplacingSlotId = useRef<string | null>(null);
  const toast = useToast();
  const autoAssignRef = useRef(false);
  const isReplacingImageRef = useRef(false);

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
    if (!draft || !layout || !draftId || uploadedImages.length === 0 || autoAssignRef.current || isLoading || isReplacingImageRef.current) {
      if (isReplacingImageRef.current) {
        console.log('[EditorPage] Skipping auto-assign - image replacement in progress');
      }
      return;
    }

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

  const handleSlotClick = useCallback((slotId: string) => {
    currentReplacingSlotId.current = slotId;
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slotId = currentReplacingSlotId.current;

    if (!file || !slotId || !draft || !draftId) {
      event.target.value = '';
      return;
    }

    // Create preview URL and show loading state
    const previewUrl = URL.createObjectURL(file);
    setUploadingSlots((prev) => {
      const updated = new Map(prev);
      updated.set(slotId, { previewUrl });
      return updated;
    });

    // Mark that we're replacing an image to prevent auto-assign
    isReplacingImageRef.current = true;

    try {
      // Upload the image
      const result = await apiClient.uploadImage(file);
      const newImage = { id: result.id, url: result.url };

      console.log('[EditorPage] Image uploaded, adding to context', {
        imageId: newImage.id,
        slotId,
      });

      // Add to uploaded images context first
      addImages([newImage]);

      // Find the layout item for this slot (need to use the same ID format as backend)
      const existingItem = draft.layoutItems.find((item) => item.slotId === slotId);

      if (!existingItem) {
        console.error('[EditorPage] No existing layoutItem found for slot', { slotId, layoutItems: draft.layoutItems.map(li => ({ id: li.id, slotId: li.slotId })) });
        throw new Error('Layout item not found for this slot');
      }

      // Update the draft with the new image - ensure we use the exact ID from existingItem
      const updatedItems: LayoutItem[] = draft.layoutItems.map((item) =>
        item.id === existingItem.id ? { ...item, imageId: newImage.id } : item
      );

      console.log('[EditorPage] Updating draft with new image', {
        slotId,
        existingItemId: existingItem.id,
        newImageId: newImage.id,
        updatedItems: updatedItems.map(item => ({ id: item.id, slotId: item.slotId, imageId: item.imageId })),
      });

      setIsSaving(true);
      const updatedDraft = await apiClient.updateDraft(draftId, {
        layoutItems: updatedItems,
      });

      // Update draft state with the new layout items
      setDraft(updatedDraft);

      const updatedSlotItem = updatedDraft.layoutItems.find(item => item.slotId === slotId);
      console.log('[EditorPage] Image replaced successfully', {
        slotId,
        imageId: newImage.id,
        updatedDraftLayoutItems: updatedDraft.layoutItems.length,
        slotItem: updatedSlotItem,
        slotItemHasImage: !!updatedSlotItem?.imageId,
      });
    } catch (err) {
      console.error('[EditorPage] Failed to replace image', err);
      toast.error(err);
    } finally {
      // Clean up
      URL.revokeObjectURL(previewUrl);
      setUploadingSlots((prev) => {
        const updated = new Map(prev);
        updated.delete(slotId);
        return updated;
      });
      setIsSaving(false);
      event.target.value = '';
      currentReplacingSlotId.current = null;

      // Allow auto-assign again after a short delay
      setTimeout(() => {
        isReplacingImageRef.current = false;
        console.log('[EditorPage] Image replacement complete, auto-assign re-enabled');
      }, 1000);
    }
  }, [draft, draftId, addImages, toast]);

  const [titleValue, setTitleValue] = useState<string>('Título del calendario');
  const [isSaved, setIsSaved] = useState(false);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (draft?.title !== undefined) {
      setTitleValue(draft.title || 'Título del calendario');
    }
  }, [draft?.title]);

  useEffect(() => {
    // Cleanup timeouts on unmount
    return () => {
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
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

    // Debounce the save operation - auto-save after 3 seconds of no typing
    titleSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const titleToSave = newTitle.trim() || undefined; // Save undefined if empty string
        const updatedDraft = await apiClient.updateDraft(draftId, {
          ...(titleToSave !== undefined && { title: titleToSave }),
        });
        setDraft(updatedDraft);
        console.log('[EditorPage] Title auto-saved', { title: titleToSave });

        // Show "Guardado" indicator for 2 seconds
        setIsSaved(true);
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false);
        }, 2000);
      } catch (err) {
        console.error('[EditorPage] Failed to auto-save title', err);
        toast.error(err);
        // Revert on error
        setTitleValue(draft.title || 'Título del calendario');
        setIsSaved(false);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 3 seconds delay
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
        continueLabel="Continuar a Vista Previa"
        continueDisabled={isSaving}
        isSaving={isSaving}
        isSaved={isSaved}
      />
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-6">
            <h2 className="text-3xl text-gray-900">{titleValue || 'Título del calendario'}</h2>
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
            uploadingSlots={uploadingSlots}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            ref={fileInputRef}
          />
        </div>
      </div>
    </>
  );
}
