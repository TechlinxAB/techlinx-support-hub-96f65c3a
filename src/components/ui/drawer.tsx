
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { useModal } from "@/components/ui/modal-provider"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  const { setIsModalOpen } = useModal();
  
  // Set modal state when drawer opens/closes
  React.useEffect(() => {
    if (props.open) {
      setIsModalOpen(true);
    }
    
    return () => {
      if (props.open) {
        setIsModalOpen(false);
      }
    };
  }, [props.open, setIsModalOpen]);
  
  return (
    <DrawerPrimitive.Root
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    />
  );
}
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = ({ onClick, ...props }: React.ComponentProps<typeof DrawerPrimitive.Close>) => {
  const { resetModalState } = useModal();
  
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    resetModalState();
    if (onClick) {
      onClick(e);
    }
  }, [onClick, resetModalState]);
  
  return <DrawerPrimitive.Close onClick={handleClick} {...props} />;
};

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { resetModalState } = useModal();
  
  // Instead of trying to access the DOM element directly via ref
  // we'll use the onOpenChange callback from the Drawer component
  // This is cleaner and avoids ref-related TypeScript errors
  React.useEffect(() => {
    return () => {
      // Reset modal state on unmount with a small delay
      setTimeout(resetModalState, 100);
    };
  }, [resetModalState]);

  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
          className
        )}
        onInteractOutside={(event) => {
          // Prevent interaction outside if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          }
          // Let the existing handler run
          if (props.onInteractOutside) {
            props.onInteractOutside(event);
          }
        }}
        onEscapeKeyDown={(event) => {
          // Prevent escape if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          }
          // Let the existing handler run
          if (props.onEscapeKeyDown) {
            props.onEscapeKeyDown(event);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Reset modal state with delay
          setTimeout(resetModalState, 100);
          
          // Let the existing handler run
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
        }}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
