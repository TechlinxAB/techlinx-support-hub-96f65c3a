import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useModal } from "./modal-provider"

const Dialog = ({ 
  open, 
  onOpenChange,
  ...props 
}: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const { setIsModalOpen, resetModalState } = useModal();
  
  // Update modal state when dialog opens/closes with improved cleanup
  React.useEffect(() => {
    if (open) {
      setIsModalOpen(true);
    } else {
      // Important: Update when closing with a delay for animation
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        // Force cleanup when dialog fully closes
        if (!open) resetModalState();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, setIsModalOpen, resetModalState]);
  
  // When dialog is closed by user, ensure proper cleanup
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (onOpenChange) onOpenChange(newOpen);
    
    // Always ensure cleanup when dialog is closed
    if (!newOpen) {
      setTimeout(() => {
        resetModalState();
      }, 300);
    }
  }, [onOpenChange, resetModalState]);
  
  return (
    <DialogPrimitive.Root 
      open={open}
      onOpenChange={handleOpenChange}
      {...props} 
    />
  );
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = ({ onClick, ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) => {
  const { resetModalState } = useModal();
  
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // First call original handler
    if (onClick) {
      onClick(e);
    }
    
    // Always ensure cleanup
    setTimeout(() => {
      resetModalState();
    }, 300);
  }, [onClick, resetModalState]);
  
  return <DialogPrimitive.Close onClick={handleClick} {...props} />;
};

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
  const { resetModalState } = useModal();
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onEscapeKeyDown={(e) => {
          // Allow ESC key to close dialog unless loading
          if (document.body.getAttribute('data-loading') === 'true') {
            e.preventDefault();
          } else {
            // Let original handler run
            if (props.onEscapeKeyDown) {
              props.onEscapeKeyDown(e);
            }
            
            // Ensure cleanup after ESC
            setTimeout(() => {
              resetModalState();
            }, 300);
          }
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing on outside click when loading
          if (document.body.getAttribute('data-loading') === 'true') {
            e.preventDefault();
          } else {
            // Let original handler run
            if (props.onPointerDownOutside) {
              props.onPointerDownOutside(e);
            }
            
            // Ensure cleanup after outside click
            setTimeout(() => {
              resetModalState();
            }, 300);
          }
        }}
        onCloseAutoFocus={(e) => {
          // Execute original handler if provided
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(e);
          }
          
          // Always ensure UI is fully reset when dialog closes
          resetModalState();
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
            // Ensure UI is properly reset
            setTimeout(() => {
              resetModalState();
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
