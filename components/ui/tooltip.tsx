import * as React from "react"

import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [show, setShow] = React.useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className={cn(
          "absolute z-50 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-normal max-w-xs -top-2 left-full ml-2",
          className
        )}>
          {content}
          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  )
}
