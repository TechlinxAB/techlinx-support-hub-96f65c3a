import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { useModal, useModalInstance } from "@/components/ui/modal-provider"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const { forceResetModalState } = useModal();
  
  // Register this popover instance with the modal system
  useModalInstance('popover');
  
  // Keep track of animation state
  const [isClosing, setIsClosing] = React.useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Force cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clean up timer if component unmounts during close animation
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      
      // Ensure modal state is reset if unmounted unexpectedly
      if (!isClosing) {
        forceResetModalState();
      }
    };
  }, [forceResetModalState, isClosing]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onOpenAutoFocus={(event) => {
          // Let native autofocus happen unless explicitly overridden
          if (props.onOpenAutoFocus) {
            props.onOpenAutoFocus(event);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Clean up everything on close with a delay for animations
          closeTimerRef.current = setTimeout(() => {
            forceResetModalState();
            setIsClosing(false);
          }, 300);
          
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
        }}
        onEscapeKeyDown={(event) => {
          // Prevent closing if loading state is active
          const loadingAttr = document.body.getAttribute('data-loading');
          if (loadingAttr === 'true') {
            event.preventDefault();
            return;
          }
          
          // Mark as closing so we can track animation state
          setIsClosing(true);
          
          if (props.onEscapeKeyDown) {
            props.onEscapeKeyDown(event);
          }
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          const loadingAttr = document.body.getAttribute('data-loading');
          if (loadingAttr === 'true') {
            event.preventDefault();
            return;
          }
          
          // Mark as closing so we can track animation state
          setIsClosing(true);
          
          if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          }
        }}
        onAnimationEnd={(event) => {
          // Additional cleanup on animation end
          const target = event.target as HTMLElement;
          if (target.getAttribute('data-state') === 'closed') {
            forceResetModalState();
            setIsClosing(false);
          }
          
          if (props.onAnimationEnd) {
            props.onAnimationEnd(event);
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
