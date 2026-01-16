import type { Layout, LayoutItem } from '@/types';

interface UploadedImage {
  id: string;
  url: string;
}

interface CalendarPreviewProps {
  layout: Layout;
  layoutItems: LayoutItem[];
  images: UploadedImage[];
  isLocked?: boolean;
  onSlotClick?: (slotId: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonthName(slotName: string): string {
  const match = slotName.match(/mes\s*(\d+)/i) || slotName.match(/month\s*(\d+)/i);
  if (match) {
    const monthNum = parseInt(match[1], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return MONTH_NAMES[monthNum - 1];
    }
  }

  if (slotName.toLowerCase().includes('portada') || slotName.toLowerCase().includes('cover')) {
    return 'Portada';
  }

  if (slotName.toLowerCase().includes('título') || slotName.toLowerCase().includes('title')) {
    return 'Título';
  }

  return slotName;
}

function sortSlots(slots: Array<{ id: string; name: string }>): Array<{ id: string; name: string }> {
  const sorted = [...slots].sort((a, b) => {
    const aMatch = a.name.match(/mes\s*(\d+)/i) || a.name.match(/month\s*(\d+)/i);
    const bMatch = b.name.match(/mes\s*(\d+)/i) || b.name.match(/month\s*(\d+)/i);

    if (aMatch && bMatch) {
      return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
    }

    if (a.name.toLowerCase().includes('portada') || a.name.toLowerCase().includes('cover')) {
      return -1;
    }
    if (b.name.toLowerCase().includes('portada') || b.name.toLowerCase().includes('cover')) {
      return 1;
    }

    if (a.name.toLowerCase().includes('título') || a.name.toLowerCase().includes('title')) {
      return -1;
    }
    if (b.name.toLowerCase().includes('título') || b.name.toLowerCase().includes('title')) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });

  return sorted;
}

export function CalendarPreview({
  layout,
  layoutItems,
  images,
  isLocked = false,
  onSlotClick,
}: CalendarPreviewProps) {
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
    if (!item?.imageId) return null;
    return images.find((img) => img.id === item.imageId) || null;
  };

  const handleSlotClick = (slotId: string) => {
    if (!isLocked && onSlotClick) {
      onSlotClick(slotId);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {coverSlot && (
          <div className="mb-8">
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              {getMonthName(coverSlot.name)}
            </div>
            <div
              className={`relative w-full aspect-[3/4] rounded-md overflow-hidden border-2 ${isLocked ? 'cursor-default' : 'cursor-pointer border-border hover:border-primary/50'
                } bg-muted`}
              onClick={() => handleSlotClick(coverSlot.id)}
            >
              {getImageForSlot(coverSlot.id) ? (
                <img
                  src={getImageForSlot(coverSlot.id)!.url}
                  alt={getMonthName(coverSlot.name)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">Agregar foto para {getMonthName(coverSlot.name)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {monthSlots.map((slot) => {
            const image = getImageForSlot(slot.id);
            const monthName = getMonthName(slot.name);

            return (
              <div key={slot.id} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  {monthName}
                </div>
                <div
                  className={`relative w-full aspect-square rounded-md overflow-hidden border-2 ${isLocked
                    ? 'cursor-default'
                    : 'cursor-pointer border-border hover:border-primary/50'
                    } bg-muted shadow-sm`}
                  onClick={() => handleSlotClick(slot.id)}
                >
                  {image ? (
                    <img
                      src={image.url}
                      alt={monthName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground p-2">
                      <span className="text-xs text-center">
                        Agregar foto para {monthName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
