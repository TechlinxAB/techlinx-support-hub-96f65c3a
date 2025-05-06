
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  // Track mount status to prevent unmounting issues
  const [isMounted, setIsMounted] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle safe cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clean up any orphaned portal elements
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach(portal => {
        if (portal.childElementCount === 0) {
          try {
            if (portal.parentNode) {
              portal.parentNode.removeChild(portal);
            }
          } catch (e) {
            console.error("Failed to clean up portal:", e);
          }
        }
      });
    };
  }, []);

  // Merge the forwarded ref with our internal ref
  const handleContentRef = React.useCallback((node: HTMLDivElement | null) => {
    // Pass the node to the forwarded ref
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
    
    // Store in our internal ref
    contentRef.current = node;
    
    // If the node exists, find its parent portal
    if (node) {
      const portal = node.closest('[data-radix-portal]');
      console.log("Popover portal found:", portal);
    }
  }, [ref]);

  if (!isMounted) return null;

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={handleContentRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        onEscapeKeyDown={(e) => {
          // Stop propagation to prevent multiple portals from closing at once
          e.stopPropagation();
        }}
        onPointerDownOutside={(e) => {
          // Prevent clicking outside from causing issues
          e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          // Allow focus but prevent scrolling issues
          e.preventDefault();
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
