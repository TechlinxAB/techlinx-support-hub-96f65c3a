
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
        duration: 0.3, // Increased duration for smoother transition
        ease: "easeInOut",
        // Ensure animations overlap to prevent white flash
        enter: { duration: 0.3 },
        exit: { duration: 0.2 }
      }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
