
import { useEffect } from 'react';
import { useModal } from './modal-provider';

export const ModalStyles = () => {
  const { isModalOpen } = useModal();

  useEffect(() => {
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
        
        // Clear all styles completely
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
        }
      }
    };
    
    // Apply immediately rather than with a delay
    handleBodyStyles();
    
    return () => {
      // Ensure styles are cleared when component unmounts
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  return null;
};

export default ModalStyles;
