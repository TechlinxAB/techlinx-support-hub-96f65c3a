
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
          paddingRight: '36px', // Ensure enough space for the close button
          borderRadius: '6px', // Slightly rounded corners for better aesthetics
          overflow: 'hidden' // Ensure no content spills out
        },
        duration: 3000,
        className: "custom-toast"
      }}
    />
  );
}
