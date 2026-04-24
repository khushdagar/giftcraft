import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-200 ease-gc disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-em/30 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        em:       "bg-em text-white hover:bg-em-600 hover:shadow-glow",
        dark:     "bg-dark text-inv hover:bg-dark-2",
        gold:     "bg-gold text-white hover:bg-gold-700",
        outline:  "border border-bdr-2 bg-transparent text-ink hover:bg-elevated",
        ghost:    "text-em hover:bg-em-50",
        danger:   "border border-err/30 text-err hover:bg-err/5",
        link:     "text-em underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm:  "h-8 rounded-md px-3 text-xs",
        md:  "h-9 rounded-md px-4 text-sm",
        lg:  "h-11 rounded-md-p px-6 text-sm",
        xl:  "h-[52px] rounded-md-p px-8 text-base",
        icon:"h-9 w-9 rounded-md",
      },
    },
    defaultVariants: { variant: "em", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
