import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-bdr-2 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3 transition-colors",
        "focus-visible:outline-none focus-visible:border-em focus-visible:ring-2 focus-visible:ring-em/10",
        "disabled:cursor-not-allowed disabled:bg-elevated disabled:text-ink-3",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
