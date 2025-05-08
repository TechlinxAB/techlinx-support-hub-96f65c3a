
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
          position: 'relative', // Ensure proper positioning context for the close button
          paddingRight: '40px' // Increased padding to avoid text overlapping with the close button
        },
        duration: 3000,
        className: "custom-toast"
      }}
    />
  );
}
