import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface MultiSelectProps {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  ({ options, value, onChange, placeholder = "Select...", className }, ref) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleToggle = (optionValue: string) => {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue]
      onChange(newValue)
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(value.filter((v) => v !== optionValue))
    }

    const selectedLabels = options
      .filter((option) => value.includes(option.value))
      .map((option) => option.label)

    return (
      <div ref={containerRef} className="relative">
        <div
          ref={ref}
          className={cn(
            "flex h-auto min-h-10 w-full cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B309C] focus-visible:ring-offset-2",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              selectedLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded bg-[#5B309C] px-2 py-0.5 text-xs text-white"
                >
                  {label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-gray-200"
                    onClick={(e) => {
                      const option = options.find((o) => o.label === label)
                      if (option) handleRemove(option.value, e)
                    }}
                  />
                </span>
              ))
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0" />
        </div>

        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100",
                  value.includes(option.value) && "bg-purple-50"
                )}
                onClick={() => handleToggle(option.value)}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border border-gray-300",
                    value.includes(option.value) && "border-[#5B309C] bg-[#5B309C]"
                  )}
                >
                  {value.includes(option.value) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
)
MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
