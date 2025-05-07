
import { useToast as useShadcnToast } from "@/hooks/use-toast"
import { toast as sonnerToast, ToastT } from "sonner"

interface ToastProps {
  title?: string;
  description?: string;
  duration?: number;
  id?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  const shadowToast = useShadcnToast()
  
  // Enhanced toast function that primarily uses Sonner for better performance
  const toast = (props: ToastProps): string => {
    const id = props.id || Date.now().toString();
    
    // Use Sonner for all toasts - it's more performant
    sonnerToast(props.title || '', {
      id,
      description: props.description,
      duration: props.duration || 4000,
      action: props.action,
      className: `${props.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}`
    })
    
    // Return the toast ID for consistency
    return id;
  }
  
  return {
    ...shadowToast,
    toast
  }
}

export { toast } from "sonner"
