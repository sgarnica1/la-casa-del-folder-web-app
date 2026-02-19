import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit } from 'lucide-react';
import { Button } from '@/components/ui';
import { Dialog, DialogContent } from '@/components/ui';
import { PhotoEditor } from '@/components/photo-editor';
import type { Layout, LayoutItem } from '@/types';
import type { ImageTransform as PhotoEditorTransform } from '@/types/photo-editor';

interface UploadedImage {
  id: string;
  url: string;
}

interface CalendarEditorProps {
  layout: Layout;
  layoutItems: LayoutItem[];
  images: UploadedImage[];
  year?: number;
  title?: string;
  onSlotClick?: (slotId: string) => void;
  onTitleChange?: (title: string) => void;
  onTransformChange?: (slotId: string, transform: LayoutItem['transform']) => void;
  isLocked?: boolean;
  layoutMode?: 'vertical' | 'grid';
  uploadingSlots?: Map<string, { previewUrl: string }>;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function getMonthName(slotName: string): string {
  // Try "mes X" or "month X" first
  let match = slotName.match(/mes\s*(\d+)/i) || slotName.match(/month\s*(\d+)/i);
  // If not found, try "Slot X" as month X (for calendar products)
  if (!match) {
    match = slotName.match(/slot\s*(\d+)/i);
  }
  if (match) {
    const monthNum = parseInt(match[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
  }

  if (slotName.toLowerCase().includes('portada') || slotName.toLowerCase().includes('cover')) {
    return 'Portada';
  }

  return slotName;
}

function getMonthNumber(slotName: string): number | null {
  // Try "mes X" or "month X" first
  let match = slotName.match(/mes\s*(\d+)/i) || slotName.match(/month\s*(\d+)/i);
  // If not found, try "Slot X" as month X (for calendar products)
  if (!match) {
    match = slotName.match(/slot\s*(\d+)/i);
  }
  if (match) {
    const monthNum = parseInt(match[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return monthNum;
    }
  }
  return null;
}

function sortSlots(slots: Array<{ id: string; name: string }>): Array<{ id: string; name: string }> {
  const sorted = [...slots].sort((a, b) => {
    // Check for portada/cover first
    const aIsCover = a.name.toLowerCase().includes('portada') || a.name.toLowerCase().includes('cover');
    const bIsCover = b.name.toLowerCase().includes('portada') || b.name.toLowerCase().includes('cover');

    if (aIsCover && !bIsCover) return -1;
    if (!aIsCover && bIsCover) return 1;

    // Extract numbers from slot names (Slot 1, Slot 10, mes 1, month 1, etc.)
    const aMatch = a.name.match(/(?:slot|mes|month)\s*(\d+)/i);
    const bMatch = b.name.match(/(?:slot|mes|month)\s*(\d+)/i);

    if (aMatch && bMatch) {
      return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
    }

    // Fallback to string comparison
    return a.name.localeCompare(b.name);
  });

  return sorted;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function generateCalendarDays(year: number, month: number): (number | null)[] {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return days;
}

export function CalendarEditor({
  layout,
  layoutItems,
  images,
  year = 2026,
  title: _title,
  onSlotClick,
  onTitleChange: _onTitleChange,
  onTransformChange,
  isLocked = false,
  layoutMode = 'vertical',
  uploadingSlots = new Map(),
}: CalendarEditorProps) {
  // Title and onTitleChange are kept in the API for compatibility but not displayed on cover
  void _title;
  void _onTitleChange;

  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [menuOpenSlotId, setMenuOpenSlotId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
  const [containerSizes, setContainerSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sortedSlots = sortSlots(layout.slots);
  const coverSlot = sortedSlots.find(
    (s) => s.name.toLowerCase().includes('portada') || s.name.toLowerCase().includes('cover')
  );
  const monthSlots = sortedSlots.filter(
    (s) => !s.name.toLowerCase().includes('portada') &&
      !s.name.toLowerCase().includes('cover') &&
      !s.name.toLowerCase().includes('título') &&
      !s.name.toLowerCase().includes('title')
  );

  const getImageForSlot = (slotId: string) => {
    const item = layoutItems.find((li) => li.slotId === slotId);
    if (!item?.imageId) {
      return null;
    }
    const image = images.find((img) => img.id === item.imageId) || null;
    return image;
  };

  const handleSlotClick = (slotId: string) => {
    if (!isLocked && onSlotClick) {
      onSlotClick(slotId);
    }
  };

  const loadImageDimensions = (imageUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const handleEditClick = async (slotId: string) => {
    const image = getImageForSlot(slotId);
    if (!image) return;

    setMenuOpenSlotId(null);

    const cached = imageDimensions.get(image.id);
    if (cached) {
      setEditingSlotId(slotId);
      return;
    }

    try {
      const dimensions = await loadImageDimensions(image.url);
      setImageDimensions((prev) => {
        const updated = new Map(prev);
        updated.set(image.id, dimensions);
        return updated;
      });
      setEditingSlotId(slotId);
    } catch (error) {
      console.error('Failed to load image dimensions:', error);
    }
  };

  const handleMenuToggle = (slotId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuOpenSlotId((prev) => (prev === slotId ? null : slotId));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenSlotId) {
        const menuElement = menuRefs.current.get(menuOpenSlotId);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setMenuOpenSlotId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenSlotId]);

  // Proactively load image dimensions for all images with transforms
  useEffect(() => {
    const loadAllImageDimensions = async () => {
      // Check current state to see what we need to load
      setImageDimensions((prev) => {
        const imagesToLoad: Array<{ id: string; url: string }> = [];

        layoutItems.forEach((item) => {
          if (item.imageId && item.transform) {
            const image = images.find((img) => img.id === item.imageId);
            if (image && !prev.has(image.id)) {
              imagesToLoad.push({ id: image.id, url: image.url });
            }
          }
        });

        if (imagesToLoad.length > 0) {
          // Load all dimensions in parallel
          Promise.all(
            imagesToLoad.map(async ({ id, url }) => {
              try {
                const dimensions = await loadImageDimensions(url);
                return { id, dimensions };
              } catch (error) {
                console.error(`Failed to load dimensions for image ${id}:`, error);
                return null;
              }
            })
          ).then((results) => {
            setImageDimensions((current) => {
              const updated = new Map(current);
              let hasChanges = false;
              results.forEach((result) => {
                if (result && !updated.has(result.id)) {
                  updated.set(result.id, result.dimensions);
                  hasChanges = true;
                }
              });
              return hasChanges ? updated : current;
            });
          });
        }

        return prev; // Return unchanged immediately
      });
    };

    loadAllImageDimensions();
  }, [layoutItems, images]);

  useEffect(() => {
    const updateContainerSizes = () => {
      setContainerSizes((prev) => {
        const newSizes = new Map<string, { width: number; height: number }>();
        let hasChanges = false;

        containerRefs.current.forEach((el, slotId) => {
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const newSize = { width: rect.width, height: rect.height };
              const oldSize = prev.get(slotId);

              // Only update if size actually changed
              if (!oldSize || oldSize.width !== newSize.width || oldSize.height !== newSize.height) {
                newSizes.set(slotId, newSize);
                hasChanges = true;
              } else {
                newSizes.set(slotId, oldSize);
              }
            }
          }
        });

        // Only update state if there are actual changes
        return hasChanges ? newSizes : prev;
      });
    };

    // Initial update after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(updateContainerSizes, 0);

    window.addEventListener('resize', updateContainerSizes);

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(updateContainerSizes);
    });

    // Observe all current containers
    containerRefs.current.forEach((el) => {
      if (el) resizeObserver.observe(el);
    });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateContainerSizes);
      resizeObserver.disconnect();
    };
  }, []);

  const handleSaveTransform = (slotId: string, transform: PhotoEditorTransform) => {
    const newTransform: LayoutItem['transform'] = {
      x: transform.offsetX,
      y: transform.offsetY,
      scale: transform.scale,
      rotation: transform.rotation,
    };

    onTransformChange?.(slotId, newTransform);
    setEditingSlotId(null);
  };

  const convertTransform = (oldTransform: LayoutItem['transform'] | undefined, originalWidth: number, originalHeight: number, cropWidth: number, cropHeight: number): Partial<PhotoEditorTransform> => {
    // Calculate minScaleToCoverCrop using effective 3:2 dimensions (matching PhotoEditor)
    const rotationRad = ((oldTransform?.rotation || 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rotationRad));
    const sin = Math.abs(Math.sin(rotationRad));
    const rotatedWidth = originalWidth * cos + originalHeight * sin;
    const rotatedHeight = originalWidth * sin + originalHeight * cos;

    const targetAR = 3 / 2;
    const cropAR = cropWidth / cropHeight;
    let effectiveCropW: number, effectiveCropH: number;
    if (cropAR > targetAR) {
      effectiveCropW = cropWidth;
      effectiveCropH = cropWidth / targetAR;
    } else {
      effectiveCropH = cropHeight;
      effectiveCropW = cropHeight * targetAR;
    }

    const rotatedAspect = rotatedWidth / rotatedHeight;
    const effectiveAspect = effectiveCropW / effectiveCropH;
    let minScaleToCoverCrop = 1;
    if (rotatedAspect > effectiveAspect) {
      minScaleToCoverCrop = effectiveCropH / rotatedHeight;
    } else {
      minScaleToCoverCrop = effectiveCropW / rotatedWidth;
    }

    if (!oldTransform) {
      const result = {
        scale: minScaleToCoverCrop,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
      };
      return result;
    }

    // The saved transform.scale is relative to minScaleToCoverCrop
    // So if scale = 0.078125 and minScaleToCoverCrop = 0.078125, that means scale = 1.0 relative
    // But we need to check: is the saved scale already the absolute scale, or relative?
    // Looking at the logs, saved scale is 0.078125 which equals minScaleToCoverCrop
    // This suggests the saved scale IS the absolute scale, not relative

    // Return the saved transform values directly
    // The scale should be the absolute scale (same as what PhotoEditor uses internally)
    const result = {
      scale: oldTransform.scale ?? minScaleToCoverCrop,
      rotation: oldTransform.rotation ?? 0,
      offsetX: oldTransform.x ?? 0,
      offsetY: oldTransform.y ?? 0,
    };
    return result;
  };

  const allSlots = layoutMode === 'grid' && coverSlot
    ? [coverSlot, ...monthSlots]
    : monthSlots;

  const renderSlot = (slot: { id: string; name: string }) => {
    const fullSlot = layout.slots.find((s) => s.id === slot.id);
    if (!fullSlot) return null;

    const isCover = slot.name.toLowerCase().includes('portada') || slot.name.toLowerCase().includes('cover');
    const monthNum = getMonthNumber(slot.name);
    const monthName = getMonthName(slot.name);
    const image = getImageForSlot(slot.id);
    const layoutItem = layoutItems.find((li) => li.slotId === slot.id);
    const transform = layoutItem?.transform;
    const calendarDays = monthNum ? generateCalendarDays(year, monthNum) : [];

    return (
      <div key={slot.id} className={layoutMode === 'grid' ? 'h-full flex flex-col' : 'flex flex-col items-center mb-8'}>
        <div className={`w-full ${layoutMode === 'grid' ? '' : 'max-w-2xl'} mb-3 flex items-center justify-between`}>
          <div className="text-md font-semibold text-gray-600">
            {isCover ? 'Portada' : `${monthName} ${year}`}
          </div>
          {image && !isLocked && (
            <div className="relative" ref={(el) => {
              if (el) menuRefs.current.set(slot.id, el);
            }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => handleMenuToggle(slot.id, e)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {menuOpenSlotId === slot.id && (
                <div className="absolute right-0 top-10 bg-white rounded-md shadow-lg border py-1 min-w-[120px] z-20">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(slot.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={`w-full ${layoutMode === 'grid' ? 'h-full flex flex-col' : 'max-w-2xl'} bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-3 md:p-4 border border-gray-200/60`}>
          <div
            ref={(el) => {
              if (el) {
                containerRefs.current.set(slot.id, el);
              } else {
                containerRefs.current.delete(slot.id);
              }
            }}
            className={`relative w-full aspect-[3/2] overflow-hidden bg-gray-100 mb-6 flex-shrink-0 rounded-none ${isLocked ? 'cursor-default' : 'cursor-pointer transition-all duration-200'}`}
            onClick={() => {
              if (image && !isLocked) {
                handleEditClick(slot.id);
              } else if (!isLocked) {
                handleSlotClick(slot.id);
              }
            }}
            style={!isLocked ? {
              transition: 'transform 200ms ease-out',
            } : {}}
          >
            {uploadingSlots.has(slot.id) ? (
              <>
                <img
                  src={uploadingSlots.get(slot.id)!.previewUrl}
                  alt={`Uploading ${monthName}`}
                  className="w-full h-full object-cover opacity-70 border-none"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              </>
            ) : image ? (
              (() => {
                const dims = imageDimensions.get(image.id);
                if (!dims) {
                  return (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={monthName}
                      className="w-full h-full object-cover !rounded-none"
                      onLoad={() => {
                        if (!imageDimensions.has(image.id)) {
                          loadImageDimensions(image.url);
                        }
                      }}
                    />
                  );
                }

                if (!transform) {
                  return (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={monthName}
                      className="w-full h-full object-cover !rounded-none"
                    />
                  );
                }

                // Apply transform similar to EditorCanvas
                // The transform.scale is relative to the minimum scale needed to cover the crop area
                const rotationRad = ((transform.rotation || 0) * Math.PI) / 180;
                const cos = Math.abs(Math.cos(rotationRad));
                const sin = Math.abs(Math.sin(rotationRad));
                const rotatedWidth = dims.width * cos + dims.height * sin;
                const rotatedHeight = dims.width * sin + dims.height * cos;

                // Get the actual display container size
                const containerSize = containerSizes.get(slot.id);
                if (!containerSize || containerSize.width === 0 || containerSize.height === 0) {
                  // Container size not available yet, render without transform
                  return (
                    <img
                      key={image.id}
                      src={image.url}
                      alt={monthName}
                      className="w-full h-full object-cover"
                    />
                  );
                }

                const displayWidth = containerSize.width;
                const displayHeight = containerSize.height;

                // Scale factor from crop to display
                const cropToDisplayScaleX = displayWidth / fullSlot.bounds.width;
                const cropToDisplayScaleY = displayHeight / fullSlot.bounds.height;
                const cropToDisplayScale = Math.min(cropToDisplayScaleX, cropToDisplayScaleY);

                const originalAspect = dims.width / dims.height;
                const displayAspect = displayWidth / displayHeight;

                // Calculate base image size to cover the display frame (at scale=1, this is the size that covers)
                let baseImageWidth: number;
                let baseImageHeight: number;
                if (originalAspect > displayAspect) {
                  // Image is wider than frame - make height match frame height
                  baseImageHeight = displayHeight;
                  baseImageWidth = displayHeight * originalAspect;
                } else {
                  // Image is taller than frame - make width match frame width
                  baseImageWidth = displayWidth;
                  baseImageHeight = displayWidth / originalAspect;
                }

                // Calculate minScaleToCoverCrop using effective 3:2 dimensions (matching PhotoEditor)
                // Both editors use 3:2 display frames, so we need consistent calculations
                const targetAR = 3 / 2;
                const cropAR = fullSlot.bounds.width / fullSlot.bounds.height;
                let effectiveCropW: number, effectiveCropH: number;
                if (cropAR > targetAR) {
                  effectiveCropW = fullSlot.bounds.width;
                  effectiveCropH = fullSlot.bounds.width / targetAR;
                } else {
                  effectiveCropH = fullSlot.bounds.height;
                  effectiveCropW = fullSlot.bounds.height * targetAR;
                }

                const rotatedAspect = rotatedWidth / rotatedHeight;
                const effectiveAspect = effectiveCropW / effectiveCropH;
                let minScaleToCoverCrop: number;
                if (rotatedAspect > effectiveAspect) {
                  minScaleToCoverCrop = effectiveCropH / rotatedHeight;
                } else {
                  minScaleToCoverCrop = effectiveCropW / rotatedWidth;
                }

                // The saved transform.scale is relative to minScaleToCoverCrop (calculated for crop dimensions)
                // normalizedScale tells us how much bigger than minimum the image should be
                const normalizedScale = (transform.scale || minScaleToCoverCrop) / minScaleToCoverCrop;

                // Apply the normalized scale to the base size (which is for display)
                const scaledWidth = baseImageWidth * normalizedScale;
                const scaledHeight = baseImageHeight * normalizedScale;

                // Scale the offset coordinates from crop space to display space
                const scaleFactor = cropToDisplayScale;

                const imageStyle: React.CSSProperties = {
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                  transform: `translate(calc(-50% + ${(transform.x || 0) * scaleFactor}px), calc(-50% + ${(transform.y || 0) * scaleFactor}px)) rotate(${transform.rotation || 0}deg)`,
                  transformOrigin: 'center center',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                };

                return (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={monthName}
                    style={imageStyle}
                    className="max-w-none"
                  />
                );
              })()
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-sm">Agregar foto para {monthName}</span>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col ${isCover ? 'justify-center' : ''}`}>
            {isCover ? (
              <div className="text-center">
                <div className="lg:text-4xl text-2xl font-bold text-gray-900">{year}</div>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div className="text-2xl font-semibold text-gray-900 flex justify-between">
                    <p className='text-4xl font-bold'>{monthName}</p>
                    <p className='text-gray-400'>{year}</p>
                  </div>
                </div>
                {monthNum && calendarDays.length > 0 ? (
                  <div className="mb-5">
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200/60">
                      <div className="grid grid-cols-7 gap-2">
                        {DAY_NAMES.map((day, index) => (
                          <div key={`day-${index}`} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                          </div>
                        ))}
                        {calendarDays.map((day, index) => (
                          <div
                            key={`calendar-day-${index}`}
                            className={`text-center py-2 text-sm transition-colors duration-150 ${day === null
                              ? 'text-transparent'
                              : 'text-gray-700 hover:bg-gray-200/60 rounded-lg cursor-default'
                              }`}
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const editingSlot = editingSlotId ? layout.slots.find((s) => s.id === editingSlotId) : null;
  const editingImage = editingSlotId ? getImageForSlot(editingSlotId) : null;
  const editingLayoutItem = editingSlotId ? layoutItems.find((item) => item.slotId === editingSlotId) : null;
  const editingDimensions = editingImage ? imageDimensions.get(editingImage.id) : null;

  return (
    <>
      <div className="w-full space-y-8">
        {layoutMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-6 items-stretch">
            {allSlots.map(renderSlot)}
          </div>
        ) : (
          <>
            {coverSlot && renderSlot(coverSlot)}
            {monthSlots.map(renderSlot)}
          </>
        )}
      </div>

      {editingSlot && editingImage && editingDimensions && (
        <Dialog open={!!editingSlotId} onOpenChange={(open) => !open && setEditingSlotId(null)} closeOnOutsideClick={false}>
          <DialogContent className="w-full h-full md:w-full md:max-w-[95vw] md:h-auto md:max-h-[90vh] p-0 flex flex-col rounded-none md:!rounded-2xl m-0 md:m-4">
            <PhotoEditor
              imageId={editingImage.id}
              imageUrl={editingImage.url}
              originalWidth={editingDimensions.width}
              originalHeight={editingDimensions.height}
              cropWidth={editingSlot.bounds.width}
              cropHeight={editingSlot.bounds.height}
              aspectRatio={3 / 2}
              initialTransform={(() => {
                const converted = convertTransform(
                  editingLayoutItem?.transform,
                  editingDimensions.width,
                  editingDimensions.height,
                  editingSlot.bounds.width,
                  editingSlot.bounds.height
                );
                return converted;
              })()}
              onSave={(transform) => handleSaveTransform(editingSlotId!, transform)}
              onCancel={() => setEditingSlotId(null)}
              onReplace={() => {
                setEditingSlotId(null);
                onSlotClick?.(editingSlotId!);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
