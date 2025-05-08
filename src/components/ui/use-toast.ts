
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
  variant?: "default" | "destructive" | "success";
  title?: string;
  duration?: number;
  id?: string | number;
};

// Maintain a record of active toasts to prevent duplicates
const activeToasts = new Set<string>();

// Generate a unique key for toast based on content
const getToastKey = (title: string, description?: string): string => {
  return `${title}-${description || ''}`;
};

// Create a wrapper around sonner toast to match our desired API
function toast(messageOrObject: string | ToastProps, props?: ToastProps) {
  // If the first argument is a string, use it as a simple message
  if (typeof messageOrObject === 'string') {
    const key = getToastKey(messageOrObject, props?.description);
    
    // If this exact toast is already showing, skip it
    if (activeToasts.has(key)) {
      console.log("Prevented duplicate toast:", key);
      return -1;
    }
    
    // Add to active toasts
    activeToasts.add(key);
    
    // Set timeout to remove from active toasts after duration
    const toastId = sonnerToast(messageOrObject, {
      description: props?.description,
      duration: props?.duration,
      id: props?.id,
      className: props?.variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
               props?.variant === "success" ? "bg-green-500 text-white" : "bg-white", // Ensure white background
      style: {
        background: '#FFFFFF', // Solid white background
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Consistent shadow
        border: '1px solid var(--border)',
        position: 'relative', // Positioning context
        paddingRight: '36px' // Space for close button
      }
    });
    
    // Remove from active toasts when dismissed or duration ends
    setTimeout(() => {
      activeToasts.delete(key);
    }, props?.duration || 3000);
    
    return toastId;
  }
  
  // If the first argument is an object, use the new API style
  const { title, description, variant, duration, id } = messageOrObject;
  const key = getToastKey(title || "", description);
  
  // If this exact toast is already showing, skip it
  if (activeToasts.has(key)) {
    console.log("Prevented duplicate toast:", key);
    return -1;
  }
  
  // Add to active toasts
  activeToasts.add(key);
  
  // Create the toast
  const toastId = sonnerToast(title || "", {
    description,
    duration,
    id,
    className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
             variant === "success" ? "bg-green-500 text-white" : "bg-white", // Ensure white background
    style: {
      background: '#FFFFFF', // Solid white background
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Consistent shadow
      border: '1px solid var(--border)',
      position: 'relative', // Positioning context
      paddingRight: '36px' // Space for close button
    }
  });
  
  // Remove from active toasts when dismissed or duration ends
  setTimeout(() => {
    activeToasts.delete(key);
  }, duration || 3000);
  
  return toastId;
}

// Add loading method to the toast function
toast.loading = (message: string, options?: { id?: string | number; duration?: number }) => {
  const key = getToastKey(message);
  
  // If a loading toast with this message already exists, don't create another
  if (activeToasts.has(key)) {
    console.log("Prevented duplicate loading toast:", key);
    return -1;
  }
  
  // Add to active toasts
  activeToasts.add(key);
  
  // Create the loading toast
  const toastId = sonnerToast.loading(message, {
    ...options,
    style: {
      background: '#FFFFFF', // Solid white background
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Consistent shadow
      border: '1px solid var(--border)',
      position: 'relative', // Positioning context
      paddingRight: '36px' // Space for close button
    }
  });
  
  // Set timeout to remove from active toasts after duration or default 30 seconds for loading
  setTimeout(() => {
    activeToasts.delete(key);
  }, options?.duration || 30000);
  
  return toastId;
};

export const useToast = () => {
  return {
    toast
  };
};

export { toast };
