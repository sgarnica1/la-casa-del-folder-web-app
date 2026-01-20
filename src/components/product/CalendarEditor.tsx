import { Pencil } from 'lucide-react';
import type { Layout, LayoutItem } from '@/types';

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
  title = 'Título del calendario',
  onSlotClick,
  onTitleChange,
  isLocked = false,
  layoutMode = 'vertical',
  uploadingSlots = new Map(),
}: CalendarEditorProps) {
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
      console.log('[CalendarEditor] No image for slot', { slotId, item: item ? { id: item.id, slotId: item.slotId } : null });
      return null;
    }
    const image = images.find((img) => img.id === item.imageId) || null;
    if (!image) {
      console.log('[CalendarEditor] Image not found in images array', {
        slotId,
        imageId: item.imageId,
        availableImageIds: images.map(img => img.id),
        layoutItem: item
      });
    }
    return image;
  };

  const handleSlotClick = (slotId: string) => {
    if (!isLocked && onSlotClick) {
      onSlotClick(slotId);
    }
  };

  const allSlots = layoutMode === 'grid' && coverSlot
    ? [coverSlot, ...monthSlots]
    : monthSlots;

  const renderSlot = (slot: { id: string; name: string }) => {
    const isCover = slot.name.toLowerCase().includes('portada') || slot.name.toLowerCase().includes('cover');
    const monthNum = getMonthNumber(slot.name);
    const monthName = getMonthName(slot.name);
    const image = getImageForSlot(slot.id);
    const calendarDays = monthNum ? generateCalendarDays(year, monthNum) : [];

    return (
      <div key={slot.id} className={layoutMode === 'grid' ? 'h-full flex' : 'flex justify-center mb-8'}>
        <div className={`w-full ${layoutMode === 'grid' ? 'h-full flex flex-col' : 'max-w-2xl'} bg-white rounded-lg shadow-md p-8`}>
          <div
            className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 mb-6 flex-shrink-0 ${isLocked ? 'cursor-default' : 'cursor-pointer hover:border-gray-300 transition-colors'}`}
            onClick={() => handleSlotClick(slot.id)}
          >
            {uploadingSlots.has(slot.id) ? (
              <>
                <img
                  src={uploadingSlots.get(slot.id)!.previewUrl}
                  alt={`Uploading ${monthName}`}
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-white/30">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              </>
            ) : image ? (
              <img
                src={image.url}
                alt={monthName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-sm">Agregar foto para {monthName}</span>
              </div>
            )}
          </div>
          <div className={`flex-1 flex flex-col ${isCover ? 'justify-center' : ''}`}>
            {isCover ? (
              <div className="text-center space-y-4">
                {!isLocked && onTitleChange ? (
                  <div className="relative group inline-block">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        if (newValue.length <= 60) {
                          onTitleChange(newValue);
                        }
                      }}
                      maxLength={60}
                      className="lg:text-2xl text-xl font text-gray-800 bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-400 outline-none text-center w-full focus:ring-2 focus:ring-gray-300 rounded px-2 py-1 transition-colors break-all"
                      placeholder=""
                    />
                    <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                ) : (
                  <div className="lg:text-3xl text-2xl text-gray-800 break-all">{title}</div>
                )}
                <div className="lg:text-4xl text-2xl font-bold text-gray-900">{year}</div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {monthName} {year}
                  </div>
                </div>
                {monthNum && calendarDays.length > 0 ? (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-7 gap-1">
                      {DAY_NAMES.map((day, index) => (
                        <div key={`day-${index}`} className="text-center text-xs font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, index) => (
                        <div
                          key={`calendar-day-${index}`}
                          className={`text-center py-2 text-sm ${day === null
                            ? 'text-transparent'
                            : 'text-gray-700 hover:bg-gray-100 rounded'
                            }`}
                        >
                          {day}
                        </div>
                      ))}
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

  return (
    <div className="w-full space-y-12">
      {layoutMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-8 items-stretch">
          {allSlots.map(renderSlot)}
        </div>
      ) : (
        <>
          {coverSlot && renderSlot(coverSlot)}
          {monthSlots.map(renderSlot)}
        </>
      )}
    </div>
  );
}
