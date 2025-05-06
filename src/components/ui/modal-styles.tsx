
import { useEffect, useRef } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen, forceResetModalState } = useModal();
  const originalStyles = useRef<{
    overflow: string;
    position: string;
    width: string;
    top: string;
  } | null>(null);
  
  useEffect(() => {
    // Track original body overflow to restore it properly
    if (!originalStyles.current) {
      const computedStyle = window.getComputedStyle(document.body);
      originalStyles.current = {
        overflow: computedStyle.overflow,
        position: computedStyle.position,
        width: computedStyle.width,
        top: computedStyle.top,
      };
    }
    
    // This function handles applying and removing body styles for modal display
    const handleBodyStyles = () => {
      if (isModalOpen) {
        // Save the current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
      } else {
        // Get the saved scroll position
        const scrollY = document.body.style.top;
        
        if (scrollY) {
          // First clear all styles
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = originalStyles.current?.overflow || '';
          
          // Then restore scroll position
          window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
        } else {
          // Just clear styles if top wasn't set
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = originalStyles.current?.overflow || '';
        }
      }
    };
    
    // Apply immediately and register a delayed backup check
    handleBodyStyles();
    
    // Safety check in case the modal was closed in an unusual way
    const safetyTimer = setTimeout(() => {
      if (!isModalOpen && document.body.style.position === 'fixed') {
        forceResetModalState();
      }
    }, 1000);
    
    return () => {
      // Clean up timer
      clearTimeout(safetyTimer);
      
      // Ensure styles are cleared when component unmounts
      if (!isModalOpen) {
        document.body.style.position = originalStyles.current?.position || '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = originalStyles.current?.overflow || '';
        document.body.removeAttribute('data-modal-open');
        document.body.removeAttribute('data-loading');
      }
    };
  }, [isModalOpen, forceResetModalState]);

  // Add a global click handler to detect when user might be trying to interact
  // with a page that's unresponsive due to stale modal state
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // If we detect clicks on the body when it has fixed position but no visible dialogs
      if (document.body.style.position === 'fixed' && !isModalOpen) {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length === 0) {
          forceResetModalState();
        }
      }
    };
    
    // Use capture phase to ensure we get the event before it's blocked
    document.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [isModalOpen, forceResetModalState]);

  return null;
};

export default ModalStyles;
