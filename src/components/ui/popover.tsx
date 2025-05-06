
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal-provider"

const Popover = ({ 
  open, 
  onOpenChange,
  ...props 
}: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  const { setIsModalOpen, resetModalState } = useModal();
  
  // Update modal state when popover opens/closes with proper cleanup
  React.useEffect(() => {
    if (open) {
      setIsModalOpen(true);
    } else {
      // Important: Update when closing with a proper delay for animation
      const timer = setTimeout(() => {
        setIsModalOpen(false);
        
        // Enhanced cleanup on close - run resetModalState only if still closed
        if (!open) {
          resetModalState();
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
    
    // Cleanup on unmount
    return () => {
      if (!open) {
        resetModalState();
      }
    };
  }, [open, setIsModalOpen, resetModalState]);
  
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(newOpen) => {
        if (onOpenChange) onOpenChange(newOpen);
        
        // Force cleanup when closing with extra safety delay
        if (!newOpen) {
          const cleanupTimer = setTimeout(() => {
            resetModalState();
          }, 350); // Slightly longer than animation duration
          
          // Clean up timer if component unmounts
          return () => clearTimeout(cleanupTimer);
        }
      }}
      {...props}
    />
  );
}

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const { resetModalState } = useModal();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);
  
  // Handle safe unmount with enhanced cleanup
  React.useEffect(() => {
    // Store references to DOM elements for cleanup
    const handleContentRefChange = (node: HTMLDivElement | null) => {
      if (node) {
        contentRef.current = node;
        
        // Find and store portal reference
        let parent = node.parentElement;
        while (parent) {
          if (parent.hasAttribute('data-radix-portal')) {
            portalRef.current = parent as HTMLDivElement; // Cast to correct type
            break;
          }
          parent = parent.parentElement;
        }
      }
    };
    
    // Apply ref handling
    if (typeof ref === 'function') {
      const originalRef = ref;
      ref = (node) => {
        originalRef(node);
        handleContentRefChange(node);
      };
    } else if (ref) {
      const originalRef = ref.current;
      handleContentRefChange(originalRef as HTMLDivElement); // Cast to correct type
    }
    
    // Cleanup function
    return () => {
      // Safe removal of portal element on unmount with multiple safety checks
      setTimeout(() => {
        try {
          if (portalRef.current && portalRef.current.isConnected) {
            const parentNode = portalRef.current.parentNode;
            if (parentNode) {
              parentNode.removeChild(portalRef.current);
            }
          }
          
          // Final safety reset
          resetModalState();
        } catch (error) {
          console.log('Safe cleanup error (ignorable):', error);
        }
      }, 100);
    };
  }, [ref, resetModalState]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={(node) => {
          // Handle ref properly
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
          
          // Store our own reference
          contentRef.current = node;
        }}
        align={align}
        sideOffset={sideOffset}
        onEscapeKeyDown={(event) => {
          // Prevent closing if loading state is active
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onEscapeKeyDown) {
            props.onEscapeKeyDown(event);
          }
          
          // Safe delayed cleanup
          setTimeout(() => {
            try {
              resetModalState();
            } catch (err) {
              console.log('Safe cleanup error (ignorable):', err);
            }
          }, 300);
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          }
          
          // Safe delayed cleanup
          setTimeout(() => {
            try {
              resetModalState();
            } catch (err) {
              console.log('Safe cleanup error (ignorable):', err);
            }
          }, 300);
        }}
        onCloseAutoFocus={(event) => {
          // Always reset modal state when popover closes
          try {
            resetModalState();
          } catch (err) {
            console.log('Safe cleanup error (ignorable):', err);
          }
          
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
