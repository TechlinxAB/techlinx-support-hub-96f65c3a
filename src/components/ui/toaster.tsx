
import React from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="bottom-right" 
      theme="light"
      closeButton
      toastOptions={{
        style: { 
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          opacity: 1
        },
        duration: 3000
      }}
    />
  );
}
