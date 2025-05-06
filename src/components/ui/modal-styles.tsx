
import { useEffect, useRef } from 'react';
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
    };
    
    // Run recovery checks on a timer
    const recoveryInterval = setInterval(recoverUI, 2000);
    
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
  }, [resetModalState]);

  return null;
};

export default ModalStyles;
