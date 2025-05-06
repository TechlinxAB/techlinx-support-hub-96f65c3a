
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { useModal } from "@/components/ui/modal-provider"

// Enhanced safety utility function - returns true if an element exists and can be safely operated on
const canSafelyRemoveElement = (element: Element | null): boolean => {
  return !!(element && element.isConnected && element.parentNode);
};

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
        
        // Only run reset if still closed
        if (!open) {
          resetModalState();
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
      };
    }
    
    // Cleanup on unmount - with extra safety check
    return () => {
      if (!open) {
        setTimeout(() => resetModalState(), 50);
      }
    };
  }, [open, setIsModalOpen, resetModalState]);
  
  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(newOpen) => {
        if (onOpenChange) onOpenChange(newOpen);
        
        // Force cleanup when closing with safety check
        if (!newOpen) {
          setTimeout(() => {
            try {
              resetModalState();
            } catch (err) {
              // Silently catch any cleanup errors
            }
          }, 300);
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
  const unmountingRef = React.useRef(false);
  
  // Enhanced unmount tracking and safer cleanup
  React.useEffect(() => {
    return () => {
      // Mark as unmounting to prevent race conditions
      unmountingRef.current = true;
      
      // Ultra-safe cleanup with multiple backoff attempts
      const attemptCleanup = (attempts = 3) => {
        try {
          if (attempts <= 0) return;
          
          // Try to safely remove the portal element
          if (portalRef.current && canSafelyRemoveElement(portalRef.current)) {
            const parent = portalRef.current.parentNode;
            if (parent) {
              try {
                parent.removeChild(portalRef.current);
              } catch (e) {
                // If direct removal fails, schedule another attempt with exponential backoff
                setTimeout(() => attemptCleanup(attempts - 1), 50 * (4 - attempts));
              }
            }
          }
          
          // Always reset modal state as a fallback
          resetModalState();
        } catch (error) {
          if (attempts > 0) {
            // Retry with backoff
            setTimeout(() => attemptCleanup(attempts - 1), 50);
          }
        }
      };
      
      // Start cleanup cascade with a slight delay
      setTimeout(() => attemptCleanup(), 50);
    };
  }, [resetModalState]);

  // Content ref handling with DOM safety checks
  const handleContentRefChange = React.useCallback((node: HTMLDivElement | null) => {
    if (!node || unmountingRef.current) return;
    
    contentRef.current = node;
    
    // Find and store portal reference using a safer approach
    setTimeout(() => {
      try {
        let parent = node.parentElement;
        let attempts = 0;
        
        // Walk up the DOM tree with safety limits
        while (parent && attempts < 10) {
          attempts++;
          if (parent.hasAttribute('data-radix-portal')) {
            portalRef.current = parent as HTMLDivElement;
            break;
          }
          parent = parent.parentElement;
        }
      } catch (e) {
        // Silently handle reference errors
      }
    }, 0);
  }, []);

  // Enhance ref handling with better safety
  React.useEffect(() => {
    const handleRef = (node: HTMLDivElement | null) => {
      if (!node || unmountingRef.current) return;
      handleContentRefChange(node);
    };
    
    // Apply ref handling based on ref type
    if (typeof ref === 'function') {
      const originalRef = ref;
      const enhancedRef = (node: HTMLDivElement | null) => {
        originalRef(node);
        handleRef(node);
      };
      // We can't directly modify the ref, this is for side effects only
      handleRef(contentRef.current);
    } else if (ref) {
      // If ref is a RefObject, we can still track the node
      handleRef(ref.current as HTMLDivElement | null);
    }
  }, [ref, handleContentRefChange]);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={(node) => {
          // Safely apply refs with better error handling
          try {
            // Apply original ref
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            
            // Store internal ref if not unmounting
            if (!unmountingRef.current) {
              contentRef.current = node;
              
              // Also try to find portal
              if (node) {
                handleContentRefChange(node);
              }
            }
          } catch (e) {
            // Silently handle ref errors
          }
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
          if (!unmountingRef.current) {
            setTimeout(() => {
              try {
                resetModalState();
              } catch (err) {
                // Silently catch any cleanup errors
              }
            }, 300);
          }
        }}
        onPointerDownOutside={(event) => {
          // Prevent clicks outside from dismissing if loading
          if (document.body.getAttribute('data-loading') === 'true') {
            event.preventDefault();
          } else if (props.onPointerDownOutside) {
            props.onPointerDownOutside(event);
          }
          
          // Safe delayed cleanup
          if (!unmountingRef.current) {
            setTimeout(() => {
              try {
                resetModalState();
              } catch (err) {
                // Silently catch any cleanup errors
              }
            }, 300);
          }
        }}
        onCloseAutoFocus={(event) => {
          // Always reset modal state when popover closes
          if (!unmountingRef.current) {
            try {
              resetModalState();
            } catch (err) {
              // Silently catch any cleanup errors
            }
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
