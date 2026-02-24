import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComboboxProps<T> {
  items: T[]
  value?: T | T[]
  onValueChange?: (value: T | T[]) => void
  multiple?: boolean
  itemToStringValue?: (item: T) => string
  children: React.ReactNode
  disabled?: boolean
  showClear?: boolean
}

interface ComboboxContextValue<T> {
  items: T[]
  value: T | T[]
  onValueChange?: (value: T | T[]) => void
  itemToStringValue: (item: T) => string
  multiple?: boolean
  disabled?: boolean
  showClear?: boolean
  open: boolean
  setOpen: (open: boolean) => void
  inputValue: string
  setInputValue: (value: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue<unknown> | null>(null)

export function Combobox<T>({
  items,
  value,
  onValueChange,
  multiple = false,
  itemToStringValue,
  children,
  disabled = false,
  showClear = false,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const getItemString = React.useCallback(
    (item: T) => {
      if (itemToStringValue) {
        return itemToStringValue(item)
      }
      return String(item)
    },
    [itemToStringValue]
  )

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const contextValue = React.useMemo(
    () => ({
      items: items as unknown[],
      value: (value || (multiple ? [] : null)) as unknown,
      onValueChange: onValueChange as ((value: unknown | unknown[]) => void) | undefined,
      itemToStringValue: getItemString as (item: unknown) => string,
      multiple,
      disabled,
      showClear,
      open,
      setOpen,
      inputValue,
      setInputValue,
    }),
    [items, value, onValueChange, getItemString, multiple, disabled, showClear, open, inputValue]
  )

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative">
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

export function ComboboxInput({
  className,
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { placeholder?: string }) {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxInput must be used within Combobox")

  const { value, itemToStringValue, open, setOpen, inputValue, setInputValue, showClear } = context

  const displayValue = React.useMemo(() => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.map(itemToStringValue).join(", ") : ""
    }
    return value ? itemToStringValue(value) : ""
  }, [value, itemToStringValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!open) {
      setOpen(true)
    }
  }

  const handleInputFocus = () => {
    setOpen(true)
  }

  const handleClear = () => {
    setInputValue("")
    if (context.onValueChange) {
      context.onValueChange(context.multiple ? [] : null)
    }
  }

  return (
    <div className="relative">
      <input
        {...props}
        value={inputValue || displayValue || ""}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        disabled={context.disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10",
          className
        )}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {showClear && value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

export function ComboboxContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxContent must be used within Combobox")

  const { open } = context

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md mt-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ComboboxList({
  children,
}: {
  children: (item: unknown) => React.ReactNode
}) {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxList must be used within Combobox")

  const { items, inputValue, itemToStringValue } = context

  const filteredItems = React.useMemo(() => {
    if (!inputValue) return items
    return items.filter((item) => {
      const itemString = itemToStringValue(item)
      return itemString.toLowerCase().includes(inputValue.toLowerCase())
    })
  }, [items, inputValue, itemToStringValue])

  return (
    <div className="max-h-[300px] overflow-auto">
      {filteredItems.map((item, index) => (
        <React.Fragment key={index}>
          {children(item)}
        </React.Fragment>
      ))}
    </div>
  )
}

export function ComboboxItem({
  value,
  children,
  className,
  ...props
}: {
  value: unknown
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxItem must be used within Combobox")

  const { value: selectedValue, itemToStringValue, onValueChange, setOpen, multiple } = context

  const isSelected = React.useMemo(() => {
    if (Array.isArray(selectedValue)) {
      return selectedValue.some(
        (v) => itemToStringValue(v) === itemToStringValue(value)
      )
    }
    return itemToStringValue(selectedValue) === itemToStringValue(value)
  }, [selectedValue, value, itemToStringValue])

  const handleClick = () => {
    if (onValueChange) {
      if (multiple) {
        const currentArray = Array.isArray(selectedValue) ? selectedValue : []
        const isCurrentlySelected = currentArray.some(
          (v) => itemToStringValue(v) === itemToStringValue(value)
        )
        if (isCurrentlySelected) {
          onValueChange(currentArray.filter((v) => itemToStringValue(v) !== itemToStringValue(value)))
        } else {
          onValueChange([...currentArray, value])
        }
      } else {
        onValueChange(value)
        setOpen(false)
      }
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-blue-100 text-blue-900",
        className
      )}
      {...props}
    >
      {isSelected && <Check className="mr-2 h-4 w-4" />}
      {children}
    </div>
  )
}

export function ComboboxEmpty({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxEmpty must be used within Combobox")

  const { items, inputValue, itemToStringValue } = context

  const hasItems = React.useMemo(() => {
    if (!inputValue) return items.length > 0
    return items.some((item) => {
      const itemString = itemToStringValue(item)
      return itemString.toLowerCase().includes(inputValue.toLowerCase())
    })
  }, [items, inputValue, itemToStringValue])

  if (hasItems) return null

  return (
    <div
      className={cn("py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}
