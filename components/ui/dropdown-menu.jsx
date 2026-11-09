"use client";
import * as React from "react";
import * as M from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = M.Root;
const DropdownMenuTrigger = M.Trigger;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
  <M.Portal>
    <M.Content ref={ref} sideOffset={sideOffset} align="end"
      className={cn("z-50 min-w-44 overflow-hidden rounded-lg border bg-card p-1 shadow-lg", className)} {...props} />
  </M.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";
const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <M.Item ref={ref}
    className={cn("flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4", className)} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
const DropdownMenuLabel = ({ className, ...props }) => (
  <M.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />
);
const DropdownMenuSeparator = ({ className, ...props }) => (
  <M.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator };
