
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
  variant?: "default" | "destructive" | "success";
  title?: string;
  duration?: number;
  id?: string | number;
};

// Create a wrapper around sonner toast to match our desired API
function toast(messageOrObject: string | ToastProps, props?: ToastProps) {
  // If the first argument is a string, use the old API style
  if (typeof messageOrObject === 'string') {
    return sonnerToast(messageOrObject, {
      description: props?.description,
      duration: props?.duration,
      id: props?.id,
      className: props?.variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
               props?.variant === "success" ? "bg-green-500 text-white" : undefined
    });
  }
  
  // If the first argument is an object, use the new API style
  const { title, description, variant, duration, id } = messageOrObject;
  return sonnerToast(title || "", {
    description,
    duration,
    id,
    className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
             variant === "success" ? "bg-green-500 text-white" : undefined
  });
}

// Add loading method to the toast function
toast.loading = (message: string, options?: { id?: string | number; duration?: number }) => {
  return sonnerToast.loading(message, options);
};

export const useToast = () => {
  return {
    toast
  };
};

export { toast };
