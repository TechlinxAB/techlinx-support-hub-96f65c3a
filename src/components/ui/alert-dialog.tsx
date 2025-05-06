import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useModal, useModalInstance } from "@/components/ui/modal-provider"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { forceResetModalState } = useModal();
  
  // Register this dialog instance with the modal system
  useModalInstance('alert-dialog');
  
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
    }
  }, [forceResetModalState, isClosing]);

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        onEscapeKeyDown={(event) => {
          // Prevent default behavior if loading
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
        onCloseAutoFocus={(event) => {
          // Schedule reset after animation completes
          closeTimerRef.current = setTimeout(() => {
            forceResetModalState();
            setIsClosing(false);
          }, 300);
          
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        onAnimationEnd={(event) => {
          // Clean up when animation ends on closing
          const target = event.target as HTMLElement;
          const state = target.getAttribute('data-state');
          if (state === 'closed') {
            forceResetModalState();
            setIsClosing(false);
          }
          
          if (props.onAnimationEnd) {
            props.onAnimationEnd(event);
          }
        }}
        {...props}
      />
    </AlertDialogPortal>
  );
})
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  const { forceResetModalState } = useModal();
  
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(buttonVariants(), className)}
      onClick={(e) => {
        // Force cleanup document body on action
        setTimeout(() => {
          forceResetModalState();
        }, 100);
        
        // Call the original onClick if it exists
        if (props.onClick) {
          props.onClick(e);
        }
      }}
      {...props}
    />
  );
})
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const { forceResetModalState } = useModal();
  
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "mt-2 sm:mt-0",
        className
      )}
      onClick={(e) => {
        // Force cleanup document body on cancel with a slight delay to allow animations
        setTimeout(() => {
          forceResetModalState();
        }, 100);
        
        // Call the original onClick if it exists
        if (props.onClick) {
          props.onClick(e);
        }
      }}
      {...props}
    />
  );
})
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
