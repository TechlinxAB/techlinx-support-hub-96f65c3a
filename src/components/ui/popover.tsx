
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal-provider"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const { setIsModalOpen, resetModalState } = useModal();
  
  // Set modal state when content mounts/unmounts
  React.useEffect(() => {
    setIsModalOpen(true);
    return () => {
      // Small delay to ensure animations complete
      setTimeout(() => {
        setIsModalOpen(false);
      }, 100);
    };
  }, [setIsModalOpen]);

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
          }
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Reset modal state when popover closes
          setTimeout(resetModalState, 100);
          
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
