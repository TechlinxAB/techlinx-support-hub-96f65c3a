
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
          background: '#FFFFFF', // Solid white background
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Add shadow for better visibility
          position: 'relative', // Ensure proper positioning context
          borderRadius: '6px', // Slightly rounded corners for better aesthetics
          padding: '16px', // Uniform padding
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80px', // Ensure minimum height for consistent appearance
          width: '100%'
        },
        duration: 3000,
        className: "custom-toast"
      }}
    />
  );
}
