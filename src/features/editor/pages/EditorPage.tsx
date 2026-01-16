import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { DraftEditorHeader } from '@/components/layout/DraftEditorHeader';
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
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const autoAssignRef = useRef(false);

  useEffect(() => {
    if (!draftId) return;

    autoAssignRef.current = false;

    const loadData = async () => {
      try {
        const [draftData, layoutData] = await Promise.all([
          apiClient.getDraft(draftId),
          apiClient.getLayout('calendar-template'),
        ]);
        setDraft(draftData);
        setLayout(layoutData);

        const imageIds = draftData.layoutItems
          .map((item) => item.imageId)
          .filter((id): id is string => id !== null && id !== undefined);

        if (imageIds.length > 0 && uploadedImages.length === 0) {
          const images = await apiClient.getImagesByIds(imageIds);
          addImages(images);
        }
      } catch (err) {
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

      const sortedSlots = [...layout.slots].sort((a, b) => {
        const aIndex = parseInt(a.id.replace('slot-', ''), 10);
        const bIndex = parseInt(b.id.replace('slot-', ''), 10);
        return aIndex - bIndex;
      });

      const unassignedImages = uploadedImages.filter(
        (img) => !draft.layoutItems.some((item) => item.imageId === img.id)
      );

      const updatedItems: LayoutItem[] = [...draft.layoutItems];

      for (let i = 0; i < Math.min(unassignedImages.length, sortedSlots.length); i++) {
        const slot = sortedSlots[i];
        const image = unassignedImages[i];
        const existingItemIndex = updatedItems.findIndex((li) => li.slotId === slot.id);

        if (existingItemIndex >= 0) {
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            imageId: image.id,
          };
        } else {
          updatedItems.push({
            id: `item-${Date.now()}-${i}`,
            slotId: slot.id,
            imageId: image.id,
          });
        }
      }

      try {
        setIsSaving(true);
        const updatedDraft = await apiClient.updateDraft(draftId, {
          layoutItems: updatedItems,
        });
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

  const getImageForSlot = (slotId: string): string | null => {
    if (!draft) return null;
    const item = draft.layoutItems.find((li) => li.slotId === slotId);
    return item?.imageId || null;
  };

  const handleAssignImage = async (slotId: string, imageId: string | null) => {
    if (!draft || !draftId) return;

    setIsSaving(true);

    try {
      const existingItemIndex = draft.layoutItems.findIndex((li) => li.slotId === slotId);
      let updatedItems: LayoutItem[];

      if (imageId === null) {
        updatedItems = draft.layoutItems.filter((li) => li.slotId !== slotId);
      } else if (existingItemIndex >= 0) {
        updatedItems = [...draft.layoutItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          imageId,
        };
      } else {
        updatedItems = [
          ...draft.layoutItems,
          {
            id: `item-${Date.now()}`,
            slotId,
            imageId,
          },
        ];
      }

      const updatedDraft = await apiClient.updateDraft(draftId, {
        layoutItems: updatedItems,
      });
      setDraft(updatedDraft);
      setSelectedSlotId(null);
      toast.success('Imagen asignada exitosamente');
    } catch (err) {
      toast.error(err);
    } finally {
      setIsSaving(false);
    }
  };

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

  if (isLoading) {
    return (
      <>
        <DraftEditorHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold">Asignar Imágenes</h2>
            <p className="text-muted-foreground mt-2">
              Las imágenes se asignan automáticamente. Haz clic en una ranura para cambiar su imagen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ranuras de Diseño</CardTitle>
                <CardDescription>
                  Haz clic en una ranura para asignar una imagen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {layout.slots.map((slot) => {
                  const assignedImageId = getImageForSlot(slot.id);
                  const assignedImage = assignedImageId
                    ? uploadedImages.find((img) => img.id === assignedImageId)
                    : null;

                  return (
                    <div
                      key={slot.id}
                      className={`border-2 rounded-md p-4 cursor-pointer transition-colors ${selectedSlotId === slot.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                        }`}
                      onClick={() => setSelectedSlotId(slot.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{slot.name}</span>
                        {slot.required && (
                          <span className="text-xs text-muted-foreground">Requerida</span>
                        )}
                      </div>
                      {assignedImage ? (
                        <div className="relative">
                          <img
                            src={assignedImage.url}
                            alt={slot.name}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignImage(slot.id, null);
                            }}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            disabled={isSaving}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                          Sin imagen
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imágenes Disponibles</CardTitle>
                <CardDescription>
                  {selectedSlotId
                    ? 'Selecciona una imagen para asignar a esta ranura'
                    : 'Haz clic en una ranura y luego en una imagen para asignarla'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay imágenes disponibles. Vuelve a la página de subida para agregar imágenes.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {uploadedImages.map((image, index) => {
                      const assignedSlotId = draft.layoutItems.find((item) => item.imageId === image.id)?.slotId;
                      const isSelectedForSlot = selectedSlotId && getImageForSlot(selectedSlotId) === image.id;
                      return (
                        <div
                          key={image.id}
                          className={`relative border-2 rounded-md overflow-hidden transition-colors ${isSelectedForSlot
                            ? 'border-primary bg-primary/10 cursor-pointer'
                            : assignedSlotId
                              ? 'border-muted-foreground/30 bg-muted/30 cursor-pointer'
                              : selectedSlotId
                                ? 'border-border hover:border-primary/50 cursor-pointer'
                                : 'border-border opacity-60'
                            }`}
                          onClick={() => {
                            if (selectedSlotId && !isSelectedForSlot) {
                              handleAssignImage(selectedSlotId, image.id);
                            }
                          }}
                        >
                          <img
                            src={image.url}
                            alt={`Image ${index + 1}`}
                            className="w-full h-24 object-cover"
                          />
                          {assignedSlotId && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              {layout.slots.find((s) => s.id === assignedSlotId)?.name || assignedSlotId}
                            </div>
                          )}
                          {isSelectedForSlot && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-foreground">
                                Asignada
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
