
// Simplified version that uses sonner for everything
import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  duration?: number;
  id?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  // Enhanced toast function that uses Sonner
  const toast = (props: ToastProps): string => {
    const id = props.id || Date.now().toString();
    
    // Use Sonner toast
    sonnerToast(props.title || '', {
      id,
      description: props.description,
      duration: props.duration || 4000,
      action: props.action,
      className: props.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''
    });
    
    // Return the toast ID for consistency
    return id;
  };
  
  // For compatibility with old code, provide a fake toasts array
  return {
    toast,
    toasts: [] // Empty array for backward compatibility
  };
};

export { toast } from "sonner";
