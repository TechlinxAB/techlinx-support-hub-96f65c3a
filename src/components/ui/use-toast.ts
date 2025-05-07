
import { useToast as useShadcnToast } from "@/hooks/use-toast"
import { toast as sonnerToast } from "sonner"

export const useToast = () => {
  const shadowToast = useShadcnToast()
  
  // Enhanced toast function that uses both systems for reliability
  const toast = (props: any) => {
    // Use Sonner for simple toasts which are more performant
    sonnerToast(props.title, {
      description: props.description,
      duration: props.duration || 4000,
      id: props.id,
      action: props.action,
      className: `${props.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}`
    })
    
    // Return the original toast ID for consistency
    return props.id || Date.now().toString()
  }
  
  return {
    ...shadowToast,
    toast
  }
}

export { toast } from "sonner"
