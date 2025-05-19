
import React from 'react';
import { Loader } from 'lucide-react';

interface TransitionOverlayProps {
  isVisible: boolean;
}

const TransitionOverlay: React.FC<TransitionOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-white z-50"
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default TransitionOverlay;
