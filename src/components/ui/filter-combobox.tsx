import * as React from "react"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "./combobox"

interface FilterComboboxProps<T> {
  label: string
  items: T[]
  value?: T | T[]
  onValueChange?: (value: T | T[]) => void
  itemToStringValue?: (item: T) => string
  placeholder?: string
  showClear?: boolean
  disabled?: boolean
  className?: string
}

export function FilterCombobox<T>({
  label,
  items,
  value,
  onValueChange,
  itemToStringValue,
  placeholder = "Seleccionar...",
  showClear = false,
  disabled = false,
  className,
}: FilterComboboxProps<T>) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <Combobox
        items={items}
        value={value}
        onValueChange={onValueChange}
        itemToStringValue={itemToStringValue}
        showClear={showClear}
        disabled={disabled}
      >
        <ComboboxInput
          placeholder={placeholder}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-180 w-[200px]"
        />
        <ComboboxContent className="w-[200px]">
          <ComboboxEmpty>No se encontraron opciones</ComboboxEmpty>
          <ComboboxList>
            {(item) => {
              const typedItem = item as T;
              return (
                <ComboboxItem key={String(item)} value={typedItem}>
                  {itemToStringValue ? itemToStringValue(typedItem) : String(typedItem)}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
