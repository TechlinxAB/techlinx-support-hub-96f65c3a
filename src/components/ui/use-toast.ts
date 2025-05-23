
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
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
    
    // Determine class based on variant
    const variantClass = props?.variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
                          props?.variant === "success" ? "bg-green-500 text-white" :
                          props?.variant === "warning" ? "bg-yellow-500 text-white" : "bg-white";
    
    // Create toast
    const toastId = sonnerToast(messageOrObject, {
      description: props?.description,
      duration: props?.duration || 3000,
      id: props?.id,
      className: `custom-toast toast-wrapper ${variantClass}`,
      // Force close button to the right
      closeButton: true
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
  
  // Determine class based on variant
  const variantClass = variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
                       variant === "success" ? "bg-green-500 text-white" :
                       variant === "warning" ? "bg-yellow-500 text-white" : "bg-white";
  
  // Create toast
  const toastId = sonnerToast(title || "", {
    description,
    duration: duration || 3000,
    id,
    className: `custom-toast toast-wrapper ${variantClass}`,
    // Force close button to the right
    closeButton: true
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
    className: "custom-toast toast-wrapper",
    // Force close button to the right
    closeButton: true
  });
  
  // Set timeout to remove from active toasts after duration or default 30 seconds for loading
  setTimeout(() => {
    activeToasts.delete(key);
  }, options?.duration || 30000);
  
  return toastId;
};

// Add dismiss method to the toast function
toast.dismiss = (toastId?: string | number) => {
  sonnerToast.dismiss(toastId);
};

// Add warning method with yellow styling
toast.warning = (message: string, options?: ToastProps) => {
  const props = {
    ...options,
    className: "custom-toast toast-wrapper bg-yellow-50 border-yellow-200",
    description: options?.description,
    duration: options?.duration || 5000,
  };
  
  return sonnerToast(message, props);
};

// Add info method with blue styling for informational messages
toast.info = (message: string, options?: ToastProps) => {
  const props = {
    ...options,
    className: "custom-toast toast-wrapper bg-blue-50 border-blue-200 text-blue-700",
    description: options?.description,
    duration: options?.duration || 4000,
  };
  
  return sonnerToast(message, props);
};

// Add offline notification method for when email services are down
toast.emailOffline = (options?: { title?: string; description?: string }) => {
  const title = options?.title || "Email Service Unavailable";
  const description = options?.description || 
    "The notification system can't send emails right now. Your action was saved, but no email notifications will be sent.";
  
  return toast({
    title,
    description,
    variant: "warning",
    duration: 6000
  });
};

export const useToast = () => {
  return {
    toast
  };
};

export { toast };
