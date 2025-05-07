
import React from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-center" 
      toastOptions={{
        style: { 
          background: 'var(--background)',
          border: '1px solid var(--border)',
        },
        duration: 3000
      }}
    />
  );
}
