import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Create a context to manage alert dialog state globally
export const AlertDialogContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {},
});

const AlertDialog = ({ children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => {
  const [isOpen, setIsOpen] = React.useState(props.open || false);
  
  // Handle external open change (from props)
  React.useEffect(() => {
    if (props.open !== undefined) {
      setIsOpen(props.open);
    }
  }, [props.open]);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (props.onOpenChange) {
      props.onOpenChange(open);
    }
  };
  
  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      <AlertDialogPrimitive.Root {...props} open={isOpen} onOpenChange={handleOpenChange}>
        {children}
      </AlertDialogPrimitive.Root>
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger>
>(({ ...props }, ref) => (
  <AlertDialogPrimitive.Trigger ref={ref} {...props} />
));
AlertDialogTrigger.displayName = AlertDialogPrimitive.Trigger.displayName;

const AlertDialogPortal = ({ ...props }: AlertDialogPrimitive.AlertDialogPortalProps) => {
  // Important: Remove conditional rendering to ensure portal always renders
  return <AlertDialogPrimitive.Portal {...props} />;
};
AlertDialogPortal.displayName = AlertDialogPrimitive.Portal.displayName;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const { setIsOpen } = React.useContext(AlertDialogContext);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  
  // Use a combined ref to track both the forwarded ref and our internal ref
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      // Set internal ref
      contentRef.current = node;
      
      // Forward ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      
      // Debug logging
      if (node) {
        console.log("AlertDialog content mounted:", node);
      }
    },
    [ref]
  );

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={setRefs}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className
        )}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          setTimeout(() => {
            setIsOpen(false);
          }, 50);
        }}
        {...props}
      />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

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
AlertDialogHeader.displayName = "AlertDialogHeader";

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
AlertDialogFooter.displayName = "AlertDialogFooter";

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
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

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
  AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

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
