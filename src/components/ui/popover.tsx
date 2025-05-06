
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  // Track whether the popover is open
  const [isOpen, setIsOpen] = React.useState(false);

  // Force cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clean up any lingering body attributes or styles
      document.body.removeAttribute('data-loading');
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onOpenAutoFocus={(event) => {
          setIsOpen(true);
          // Let native autofocus happen unless explicitly overridden
          if (props.onOpenAutoFocus) {
            props.onOpenAutoFocus(event);
          }
        }}
        onCloseAutoFocus={(event) => {
          setIsOpen(false);
          
          // Clean up everything on close
          document.body.removeAttribute('data-loading');
          document.body.removeAttribute('data-modal-open');
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          
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
          
          if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
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
