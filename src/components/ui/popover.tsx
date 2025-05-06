
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal-provider"

const Popover = ({ 
  open, 
  onOpenChange,
  ...props 
}: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  const { setIsModalOpen, resetModalState } = useModal();
  
  // Update modal state when popover opens/closes with proper cleanup
  React.useEffect(() => {
    if (open) {
      setIsModalOpen(true);
    } else {
      // Important: Update when closing with a proper delay for animation
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        // Force cleanup in case anything is stuck
        if (!open) {
          const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
          if (overlays.length > 0) {
            resetModalState();
          }
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, setIsModalOpen, resetModalState]);
  
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(newOpen) => {
        if (onOpenChange) onOpenChange(newOpen);
        // Force cleanup when closing
        if (!newOpen) {
          setTimeout(resetModalState, 300);
        }
      }}
      {...props}
    />
  );
}

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const { resetModalState } = useModal();

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onEscapeKeyDown={(event) => {
          // Prevent closing if loading state is active
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onEscapeKeyDown) {
            props.onEscapeKeyDown(event);
          } else {
            // Ensure cleanup after ESC closes popover
            setTimeout(resetModalState, 300);
          }
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          } else {
            // Ensure cleanup after click outside closes popover
            setTimeout(resetModalState, 300);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Always reset modal state when popover closes
          resetModalState();
          
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
        }}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
