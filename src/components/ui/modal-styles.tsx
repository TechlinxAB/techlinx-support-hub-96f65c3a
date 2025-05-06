
import { useEffect } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen, resetModalState } = useModal();
  
  // Global UI recovery system
  useEffect(() => {
    // Recovery function that runs on a regular interval
    const recoverUI = () => {
      // Check if body is in fixed position without a visible dialog
      const isBodyFixed = document.body.style.position === 'fixed';
      if (isBodyFixed) {
        const hasVisibleDialogs = 
          document.querySelectorAll('[role="dialog"]').length > 0 || 
          document.querySelectorAll('[data-state="open"]').length > 0;
        
        if (!hasVisibleDialogs) {
          // No dialogs but body is locked - reset UI
          resetModalState();
          console.log('UI automatically recovered by global safety system');
        }
      }
      
      // Check for zombie overlay elements
      const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
      if (overlays.length > 0 && !isModalOpen) {
        // Found overlay elements but no active modal - force cleanup
        resetModalState();
        console.log('Zombie overlay elements cleaned up');
      }
    };
    
    // Run recovery checks on a timer
    const recoveryInterval = setInterval(recoverUI, 1000);
    
    // Also run recovery on user interactions
    const handleUserInteraction = () => {
      setTimeout(recoverUI, 100);
    };
    
    document.addEventListener('click', handleUserInteraction, true);
    document.addEventListener('keydown', handleUserInteraction, true);
    
    return () => {
      clearInterval(recoveryInterval);
      document.removeEventListener('click', handleUserInteraction, true);
      document.removeEventListener('keydown', handleUserInteraction, true);
    };
  }, [resetModalState, isModalOpen]);
  
  // Regular check for zombie overlay elements
  useEffect(() => {
    const cleanupZombieOverlays = () => {
      // If no dialogs are open, remove any stray overlay elements
      if (!isModalOpen) {
        const overlays = document.querySelectorAll('.fixed.inset-0.z-50.bg-black\\/80');
        if (overlays.length > 0) {
          overlays.forEach(overlay => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
              console.log('Removed zombie overlay element');
            }
          });
        }
      }
    };
    
    // Check for overlays periodically
    const cleanupInterval = setInterval(cleanupZombieOverlays, 2000);
    
    return () => clearInterval(cleanupInterval);
  }, [isModalOpen]);

  return null;
};

export default ModalStyles;
