import * as React from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={`w-full rounded-md border-2 border-bdr bg-white px-4 py-2.5 text-sm text-ink appearance-none transition focus:outline-none focus:border-em focus:ring-0 ${className}`}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
    </div>
  )
)
Select.displayName = 'Select'

export { Select }
