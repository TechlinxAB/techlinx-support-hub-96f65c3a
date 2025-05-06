import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal-provider"

const Sheet = ({ 
  open, 
  onOpenChange,
  ...props 
}: React.ComponentProps<typeof SheetPrimitive.Root>) => {
  const { setIsModalOpen, resetModalState } = useModal();
  
  // Update modal state when sheet opens/closes with improved cleanup
  React.useEffect(() => {
    if (open) {
      setIsModalOpen(true);
    } else {
      // Important: Update when closing with proper delay and cleanup
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        // Force cleanup when sheet fully closes
        if (!open) resetModalState();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, setIsModalOpen, resetModalState]);
  
  // Handle open change with thorough cleanup
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (onOpenChange) onOpenChange(newOpen);
    
    // Always ensure cleanup when sheet closes
    if (!newOpen) {
      setTimeout(() => {
        resetModalState();
      }, 300);
    }
  }, [onOpenChange, resetModalState]);
  
  return (
    <SheetPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      {...props}
    />
  );
}

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = ({ onClick, ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) => {
  const { resetModalState } = useModal();
  
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // First call original handler
    if (onClick) {
      onClick(e);
    }
    
    // Always ensure thorough cleanup
    resetModalState();
    
    // Extra safety cleanup after animation
    setTimeout(() => {
      const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
      if (overlays.length > 0) {
        overlays.forEach(overlay => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        });
      }
    }, 300);
  }, [onClick, resetModalState]);
  
  return <SheetPrimitive.Close onClick={handleClick} {...props} />;
};

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
    onPointerDown={(e) => {
      // Run original handler if provided
      if (props.onPointerDown) {
        props.onPointerDown(e);
      }
    }}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> { }

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const { resetModalState } = useModal();

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        onEscapeKeyDown={(event) => {
          // Prevent default behavior if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onEscapeKeyDown) {
            props.onEscapeKeyDown(event);
          }
          
          // Ensure cleanup after ESC key
          setTimeout(() => {
            resetModalState();
          }, 300);
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          }
          
          // Ensure cleanup after outside click
          setTimeout(() => {
            resetModalState();
          }, 300);
        }}
        onCloseAutoFocus={(event) => {
          // Reset modal state when sheet is closed
          resetModalState();
          
          if (props.onCloseAutoFocus) {
            props.onCloseAutoFocus(event);
          }
          
          // Extra cleanup for any remaining elements
          setTimeout(() => {
            document.querySelectorAll('[data-radix-portal]').forEach(portal => {
              const isEmptyPortal = portal.children.length === 0;
              if (isEmptyPortal && portal.parentNode) {
                portal.parentNode.removeChild(portal);
              }
            });
          }, 350);
        }}
        {...props}
      >
        {children}
        <SheetPrimitive.Close 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          onClick={() => {
            // Ensure reset when close button is clicked
            setTimeout(() => {
              resetModalState();
            }, 300);
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
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
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet, SheetClose,
  SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger
}
