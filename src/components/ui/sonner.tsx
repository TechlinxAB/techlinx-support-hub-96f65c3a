
// Re-export the toast function from use-toast
export { toast } from "./use-toast";

// Don't re-export Toaster as it's now imported directly from toaster.tsx where needed
// This prevents duplicate toast containers from being rendered
