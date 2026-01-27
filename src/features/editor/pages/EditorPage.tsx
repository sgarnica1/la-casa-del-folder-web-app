import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Skeleton, ErrorDisplay } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
import { CalendarEditor } from '@/components/product/CalendarEditor';
import { apiClient } from '@/services/api-client';
import { useUploadedImages } from '@/contexts/UploadedImagesContext';
import { useToast } from '@/hooks/useToast';
import { useWaitForToken } from '@/hooks/useWaitForToken';
import type { Draft, Layout, LayoutItem } from '@/types';

const hasLoadedImagesRef = new Map<string, boolean>();

export function EditorPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { waitForToken, isLoaded, isSignedIn } = useWaitForToken();
  const { images: uploadedImages, addImages } = useUploadedImages();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<Map<string, { previewUrl: string }>>(new Map());
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentReplacingSlotId = useRef<string | null>(null);
  const toast = useToast();
  const autoAssignRef = useRef(false);
  const isReplacingImageRef = useRef(false);
  const addImagesRef = useRef(addImages);
  const toastRef = useRef(toast);

  useEffect(() => {
    console.log("isLoading Editor Page", isLoading)
    console.log("isLoaded Editor Page", isLoaded)
    console.log("isLoadingImages Editor Page", isLoadingImages)
  }, [isLoading, isLoaded, isLoadingImages])

  useEffect(() => {
    console.log("useEffect addImagesRef")
    addImagesRef.current = addImages;
    toastRef.current = toast;
  }, [addImages, toast]);

  useEffect(() => {
    if (!draftId) return;

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsLoading(false);
      setIsLoadingImages(false);
      return;
    }

    autoAssignRef.current = false;

    const loadData = async () => {
      console.log("loadData Editor Page")
      const token = await waitForToken();
      if (!token) {
        console.warn('[EditorPage] No token available, cannot load draft');
        setIsLoading(false);
        setIsLoadingImages(false);
        return;
      }

      try {
        console.log('[EditorPage] Loading data for draft', { draftId });
        const [draftData, layoutData] = await Promise.all([
          apiClient.drafts.getDraft(draftId),
          apiClient.layouts.getLayout('calendar-template'),
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
            if (!id || typeof id !== 'string') return false;
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

        if (imageIds.length > 0) {
          const existingImageIds = new Set(uploadedImages.map(img => img.id));
          const missingImageIds = imageIds.filter(id => !existingImageIds.has(id));

          if (missingImageIds.length > 0) {
            setIsLoadingImages(true);
            try {
              console.log('[EditorPage] Fetching missing images by IDs', { missingImageIds });
              const images = await apiClient.assets.getImagesByIds(missingImageIds);
              console.log('[EditorPage] Images fetched', { count: images.length });
              addImagesRef.current(images);
              hasLoadedImagesRef.set(draftId, true);
            } catch (imageErr) {
              console.error('[EditorPage] Error fetching images', imageErr);
              toastRef.current.error(imageErr);
            } finally {
              setIsLoadingImages(false);
            }
          } else {
            console.log('[EditorPage] All images already in context');
            // Check if we need to auto-assign images before setting loading to false
            const needsAutoAssign = uploadedImages.some((img) => !draftData.layoutItems.some((item) => item.imageId === img.id));

            if (needsAutoAssign) {
              console.log('[EditorPage] Images need to be auto-assigned, keeping loading state');
              // Keep isLoadingImages true - auto-assign will set it to false when done
            } else {
              setIsLoadingImages(false);
            }
            hasLoadedImagesRef.set(draftId, true);
          }
        } else {
          console.log('[EditorPage] No images to load');
          // Check if we need to auto-assign images before setting loading to false
          const needsAutoAssign = uploadedImages.length > 0 &&
            uploadedImages.some((img) => !draftData.layoutItems.some((item) => item.imageId === img.id));

          if (needsAutoAssign) {
            console.log('[EditorPage] Images need to be auto-assigned, keeping loading state');
            // Keep isLoadingImages true - auto-assign will set it to false when done
          } else {
            setIsLoadingImages(false);
          }
          hasLoadedImagesRef.set(draftId, true);
        }
      } catch (err) {
        console.error('[EditorPage] Error loading data', err);
        const errorMessage = err instanceof Error ? err.message : 'No se pudo cargar el borrador';
        const errorStatus = err instanceof Error && 'status' in err ? (err as { status: number }).status : undefined;

        setError({ message: errorMessage, status: errorStatus });
        setIsLoadingImages(false);

        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status === 401) {
            console.warn('[EditorPage] 401 Unauthorized - authentication may not be ready');
            toastRef.current.error('Error de autenticación. Por favor, recarga la página.');
          } else {
            toastRef.current.error(err);
          }
        } else {
          toastRef.current.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, isLoaded, isSignedIn, waitForToken]);

  useEffect(() => {
    if (!draft || !layout || !draftId || uploadedImages.length === 0 || autoAssignRef.current || isLoading || isReplacingImageRef.current || isAutoAssigning) {
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
        setIsAutoAssigning(true);
        const updatedDraft = await apiClient.drafts.updateDraft(draftId, {
          layoutItems: updatedItems,
        });
        console.log('[EditorPage] Auto-assign successful', { layoutItemsCount: updatedDraft.layoutItems.length });
        setDraft(updatedDraft);
      } catch (err) {
        console.error('Failed to auto-assign images:', err);
        toastRef.current.error(err);
      } finally {
        setIsSaving(false);
        setIsAutoAssigning(false);
        setIsLoadingImages(false);
      }
    };

    autoAssign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.id, layout?.slots.length, uploadedImages.length, draftId, isLoading, isAutoAssigning]);


  const hasAllImages = (): boolean => {
    if (!draft || !layout) return false;

    const allSlots = layout.slots;
    const slotsWithImages = new Set(
      draft.layoutItems
        .filter(item => item.imageId)
        .map(item => item.slotId)
    );

    return allSlots.every(slot => slotsWithImages.has(slot.id));
  };

  const handleContinue = () => {
    if (draftId && hasAllImages()) {
      navigate(`/draft/${draftId}/confirm`);
    }
  };

  const handleBack = () => {
    const fromPath = location.state?.from as string | undefined;
    if (fromPath && fromPath.startsWith('/account/my-designs')) {
      navigate('/account/my-designs');
    } else if (draftId) {
      navigate(`/draft/${draftId}/upload`);
    } else {
      navigate(-1);
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
      const result = await apiClient.assets.uploadImage(file);
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
      const updatedDraft = await apiClient.drafts.updateDraft(draftId, {
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

      toastRef.current.success('Imagen subida exitosamente');
    } catch (err) {
      console.error('[EditorPage] Failed to replace image', err);
      toastRef.current.error(err);
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
  }, [draft, draftId, addImages]);

  const [titleValue, setTitleValue] = useState<string>('Agregar título');
  const [isSaved, setIsSaved] = useState(false);
  const [isEditingMainTitle, setIsEditingMainTitle] = useState(false);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mainTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draft?.title !== undefined) {
      setTitleValue(draft.title || 'Agregar título');
    }
  }, [draft?.title]);

  useEffect(() => {
    if (isEditingMainTitle && mainTitleInputRef.current) {
      mainTitleInputRef.current.focus();
      mainTitleInputRef.current.select();
    }
  }, [isEditingMainTitle]);

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

    const trimmedTitle = newTitle.length > 60 ? newTitle.substring(0, 60) : newTitle;
    setTitleValue(trimmedTitle);

    // Clear previous timeout
    if (titleSaveTimeoutRef.current) {
      clearTimeout(titleSaveTimeoutRef.current);
    }

    // Debounce the save operation - auto-save after 3 seconds of no typing
    titleSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const titleToSave = trimmedTitle.trim() || undefined; // Save undefined if empty string
        const updatedDraft = await apiClient.drafts.updateDraft(draftId, {
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
        }, 1000);
      } catch (err) {
        toastRef.current.error(err);
        // Revert on error
        setTitleValue(draft.title || 'Agregar título');
        setIsSaved(false);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 3 seconds delay
  }, [draft, draftId]);

  if (isLoading || isLoadingImages || isAutoAssigning) {
    return (
      <>
        <DraftEditorHeader />
        <div className="w-full bg-gray-50 min-h-screen">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-6">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-100" />
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

  if (!draft || !layout || error) {
    return (
      <>
        <DraftEditorHeader />
        <ErrorDisplay
          message={error?.message || 'No se pudo cargar el borrador'}
          status={error?.status}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            if (draftId) {
              window.location.reload();
            }
          }}
          onGoBack={() => navigate('/account/my-designs')}
          onGoHome={() => navigate('/')}
        />
      </>
    );
  }

  return (
    <>
      <DraftEditorHeader
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel="Continuar"
        continueDisabled={isSaving || !hasAllImages()}
        isSaving={isSaving}
        isSaved={isSaved}
      />
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="mb-6">
            <div className="relative group inline-block">
              {isEditingMainTitle ? (
                <input
                  ref={mainTitleInputRef}
                  type="text"
                  value={titleValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue.length <= 60) {
                      handleTitleChange(newValue);
                    }
                  }}
                  onBlur={() => setIsEditingMainTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingMainTitle(false);
                    }
                  }}
                  maxLength={60}
                  className="w-full text-3xl text-gray-900 break-all bg-transparent border-b-2 border-gray-400 outline-none focus:border-gray-600 transition-colors"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingMainTitle(true)}
                  className="text-3xl text-gray-900 break-all cursor-pointer hover:text-gray-700 transition-colors"
                >
                  {titleValue || 'Agregar título'}
                  <Pencil className="inline-block ml-2 h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h2>
              )}
            </div>
            {draft.updatedAt && (
              <p className="text-muted-foreground mt-2 text-sm">
                Editado por última vez el {new Date(draft.updatedAt).toLocaleString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            <p className="text-muted-foreground mt-10 text-sm">
              Haz clic en una foto para cambiarla.
            </p>
            {!hasAllImages() && !isLoadingImages && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-500 rounded-lg">
                <p className="text-sm text-blue-500">
                  Agrega fotos a todos los espacios para continuar.
                </p>
              </div>
            )}
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
