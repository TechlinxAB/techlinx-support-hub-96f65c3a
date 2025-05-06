import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useModal, useModalInstance } from "@/components/ui/modal-provider"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { forceResetModalState } = useModal();
  
  // Register this dialog instance with the modal system
  useModalInstance('dialog');
  
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
      
      // Force reset if this was unmounted unexpectedly
      if (!isClosing) {
        forceResetModalState();
      }
    }
  }, [forceResetModalState, isClosing]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onOpenAutoFocus={(event) => {
          // Handle focusing when dialog opens
          if (props.onOpenAutoFocus) {
            props.onOpenAutoFocus(event);
          }
        }}
        onEscapeKeyDown={(event) => {
          // Prevent default behavior only if loading
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
          // Prevent clicks outside from dismissing if loading state is active
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
        onInteractOutside={(event) => {
          // Prevent any outside interactions if loading
          const loadingAttr = document.body.getAttribute('data-loading');
          if (loadingAttr === 'true') {
            event.preventDefault();
            return;
          }
          
          if (props.onInteractOutside) {
            props.onInteractOutside(event);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Force cleanup on close with a slight delay to ensure animations complete
          closeTimerRef.current = setTimeout(() => {
            forceResetModalState();
            setIsClosing(false);
          }, 300);
          
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
        }}
        onAnimationEnd={(event) => {
          // Additional cleanup on animation end
          const state = (event.target as HTMLElement).getAttribute('data-state');
          if (state === 'closed') {
            forceResetModalState();
            setIsClosing(false);
          }
          
          if (props.onAnimationEnd) {
            props.onAnimationEnd(event);
          }
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => {
            // Mark as closing and start cleanup
            setIsClosing(true);
            
            // Schedule a complete reset after animation
            closeTimerRef.current = setTimeout(() => {
              forceResetModalState();
              setIsClosing(false);
            }, 300);
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
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
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
