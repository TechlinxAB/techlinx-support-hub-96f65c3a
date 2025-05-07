
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
  variant?: "default" | "destructive" | "success";
  title?: string;
};

// Create a wrapper around sonner toast to match our desired API
export function toast(messageOrObject: string | ToastProps, props?: ToastProps) {
  // If the first argument is a string, use the old API style
  if (typeof messageOrObject === 'string') {
    return sonnerToast(messageOrObject, {
      description: props?.description,
      className: props?.variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
               props?.variant === "success" ? "bg-green-500 text-white" : undefined
    });
  }
  
  // If the first argument is an object, use the new API style
  const { title, description, variant } = messageOrObject;
  return sonnerToast(title || "", {
    description,
    className: variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
             variant === "success" ? "bg-green-500 text-white" : undefined
  });
}

export const useToast = () => {
  return {
    toast
  };
};
