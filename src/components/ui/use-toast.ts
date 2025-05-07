
import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
  variant?: "default" | "destructive" | "success";
};

// Create a wrapper around sonner toast to match our desired API
export function toast(message: string, props?: ToastProps) {
  return sonnerToast(message, {
    description: props?.description,
    className: props?.variant === "destructive" ? "bg-destructive text-destructive-foreground" : 
               props?.variant === "success" ? "bg-green-500 text-white" : undefined
  });
}

export const useToast = () => {
  return {
    toast
  };
};
