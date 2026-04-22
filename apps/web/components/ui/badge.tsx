import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-gc-p px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        em:    "bg-em-50 text-em-700",
        gold:  "bg-gold-50 text-gold-700",
        grey:  "bg-elevated text-ink-3",
        blue:  "bg-[#E8E0F5] text-[#5B3D8F]",
        red:   "bg-[#FFEBEE] text-err",
        orange:"bg-[#FFF3E0] text-[#E65100]",
      },
    },
    defaultVariants: { variant: "grey" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
