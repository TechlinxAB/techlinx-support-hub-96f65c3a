import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Create a context to manage dialog state globally
export const DialogContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

const Dialog = ({ children, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  const [isOpen, setIsOpen] = React.useState(props.open || false);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (props.onOpenChange) {
      props.onOpenChange(open);
    }
  };
  
  return (
    <DialogContext.Provider value={{ isOpen, setIsOpen }}>
      <DialogPrimitive.Root {...props} open={isOpen} onOpenChange={handleOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ ...props }, ref) => (
  <DialogPrimitive.Trigger ref={ref} {...props} />
));
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName;

const DialogPortal = ({ ...props }: DialogPrimitive.DialogPortalProps) => {
  const portalRef = React.useRef<HTMLElement | null>(null);
  const { isOpen } = React.useContext(DialogContext);
  
  // Clean up the portal element when dialog closes
  React.useEffect(() => {
    return () => {
      // Safety cleanup for portal elements
      if (portalRef.current && document.body.contains(portalRef.current)) {
        try {
          document.body.removeChild(portalRef.current);
        } catch (e) {
          console.error("Failed to clean up dialog portal:", e);
        }
      }
    };
  }, []);
  
  // Only render when dialog is open
  if (!isOpen) return null;

  return <DialogPrimitive.Portal {...props} ref={portalRef as any} />;
};
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

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
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const { setIsOpen } = React.useContext(DialogContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  
  // Handle safe unmounting
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        
        // Delay the state update to allow animations to complete
        setTimeout(() => {
          setIsOpen(false);
        }, 100);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [setIsOpen]);
  
  // Handle safe content cleanup
  React.useEffect(() => {
    return () => {
      if (contentRef.current) {
        // Ensure we're cleaning up React-managed DOM correctly
        contentRef.current.classList.add("dialog-removing");
        
        // Allow animations to finish before actual DOM removal
        setTimeout(() => {
          const dialogContainers = document.querySelectorAll('[role="dialog"]');
          dialogContainers.forEach(container => {
            if (container.classList.contains("dialog-removing")) {
              try {
                if (container.parentNode) {
                  container.parentNode.removeChild(container);
                }
              } catch (e) {
                console.error("Failed to clean up dialog content:", e);
              }
            }
          });
        }, 300); // Match animation duration
      }
    };
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          // Merge refs
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          contentRef.current = node;
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        onPointerDownOutside={(e) => {
          // Safe close on outside click
          e.preventDefault();
          setTimeout(() => {
            setIsOpen(false);
          }, 50);
        }}
        onEscapeKeyDown={(e) => {
          // Safe close on escape
          e.preventDefault();
          setTimeout(() => {
            setIsOpen(false);
          }, 50);
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close 
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={() => {
            // Ensure state is properly updated when close button is clicked
            setTimeout(() => {
              setIsOpen(false);
            }, 50);
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

DialogContent.displayName = DialogPrimitive.Content.displayName;

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
DialogHeader.displayName = "DialogHeader";

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
DialogFooter.displayName = "DialogFooter";

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
DialogTitle.displayName = DialogPrimitive.Title.displayName;

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
DialogDescription.displayName = DialogPrimitive.Description.displayName;

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
