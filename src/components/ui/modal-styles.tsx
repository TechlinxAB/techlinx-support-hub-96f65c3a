
import { useEffect } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen } = useModal();

  useEffect(() => {
    // Add a small delay to ensure modal animations complete
    const applyStyles = () => {
      if (isModalOpen) {
        // Save the current scroll position
        const scrollY = window.scrollY;
        
        // Apply styles to prevent scrolling of background content
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
      } else {
        // Restore scrolling and scroll position
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
        }
      }
    };
    
    // Apply with slight delay to avoid flicker
    const timer = setTimeout(applyStyles, 50);
    
    return () => {
      clearTimeout(timer);
      
      // Safety cleanup when component unmounts
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isModalOpen]);

  return null;
};

export default ModalStyles;
