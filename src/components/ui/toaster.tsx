
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
          background: '#FFFFFF', // Solid white background
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Add shadow for better visibility
          position: 'relative', // Ensure proper positioning context for the close button
          paddingRight: '36px' // Add padding to avoid text overlapping with the close button
        },
        duration: 3000,
        closeButton: {
          style: {
            position: 'absolute',
            top: '12px', // Position close button in the top-right corner with proper spacing
            right: '12px',
            backgroundColor: 'transparent', // Make background transparent
            opacity: 0.7, // Slightly transparent by default
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            ':hover': {
              opacity: 1 // Full opacity on hover
            }
          }
        }
      }}
    />
  );
}
