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
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

  console.log('[CalendarEditor] Slots info', {
    totalSlots: layout.slots.length,
    sortedSlotsCount: sortedSlots.length,
    hasCoverSlot: !!coverSlot,
    coverSlotName: coverSlot?.name,
    monthSlotsCount: monthSlots.length,
    monthSlotNames: monthSlots.map(s => s.name),
    layoutItemsCount: layoutItems.length,
    imagesCount: images.length,
  });

  const getImageForSlot = (slotId: string) => {
    const item = layoutItems.find((li) => li.slotId === slotId);
    if (!item?.imageId) return null;
    return images.find((img) => img.id === item.imageId) || null;
  };

  const handleSlotClick = (slotId: string) => {
    if (onSlotClick) {
      onSlotClick(slotId);
    }
  };

  return (
    <div className="w-full space-y-12">
      {coverSlot && (
        <div className="flex justify-center">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
            <div
              className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 cursor-pointer hover:border-gray-300 transition-colors mb-6"
              onClick={() => handleSlotClick(coverSlot.id)}
            >
              {getImageForSlot(coverSlot.id) ? (
                <img
                  src={getImageForSlot(coverSlot.id)!.url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-sm">Agregar foto para Portada</span>
                </div>
              )}
            </div>
            <div className="text-center space-y-4">
              {onTitleChange ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="text-4xl font-bold text-gray-800 bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-400 outline-none text-center w-full focus:ring-2 focus:ring-gray-300 rounded px-2 py-1 transition-colors"
                  placeholder="Título del calendario"
                />
              ) : (
                <div className="text-4xl font-bold text-gray-800">{title}</div>
              )}
              <div className="text-5xl font-bold text-gray-900">{year}</div>
            </div>
          </div>
        </div>
      )}

      {monthSlots.map((slot) => {
        const monthNum = getMonthNumber(slot.name);
        const monthName = getMonthName(slot.name);
        const image = getImageForSlot(slot.id);
        const calendarDays = monthNum ? generateCalendarDays(year, monthNum) : [];

        return (
          <div key={slot.id} className="flex justify-center mb-8">
            <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
              <div
                className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 cursor-pointer hover:border-gray-300 transition-colors mb-6"
                onClick={() => handleSlotClick(slot.id)}
              >
                {image ? (
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
              <div className="mb-4">
                <div className="text-2xl font-semibold text-gray-900">
                  {monthName} {year}
                </div>
              </div>
              {monthNum && calendarDays.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    {calendarDays.map((day, index) => (
                      <div
                        key={index}
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
