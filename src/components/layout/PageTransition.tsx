
import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.5, // Increased for smoother transitions
        ease: "easeInOut",
        // Use longer exit duration to ensure smooth crossfade
        enter: { duration: 0.5 },
        exit: { duration: 0.2 }
      }}
      style={{ 
        willChange: 'opacity',
        position: 'relative',
        background: 'white' // Force white background
      }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
