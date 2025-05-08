
import React from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="bottom-right" 
      theme="light"
      closeButton={true}
      toastOptions={{
        style: { 
          background: '#FFFFFF', 
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          minHeight: 'auto',
          width: '100%',
          position: 'relative'
        },
        duration: 3000,
        className: "custom-toast"
      }}
    />
  );
}
