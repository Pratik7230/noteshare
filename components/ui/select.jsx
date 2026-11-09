import * as React from "react";
import { cn } from "@/lib/utils";
/** Styled native select: accessible and works on mobile. */
export const Select = React.forwardRef(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("h-9 w-full rounded-lg border bg-card px-3 text-sm shadow-sm cursor-pointer", className)} {...props} />
));
Select.displayName = "Select";
