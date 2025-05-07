
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="relative overflow-hidden">
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            {props.variant !== "destructive" && props.duration && props.duration > 1000 && !("id" in props && props.id === "closed") && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-primary/50"
                style={{
                  width: '100%',
                  animation: `toast-progress ${props.duration / 1000}s linear forwards`
                }}
              />
            )}
          </Toast>
        )
      })}
      <ToastViewport />
      <style>{`
        @keyframes toast-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </ToastProvider>
  )
}
