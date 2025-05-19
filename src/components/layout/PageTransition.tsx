
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        duration: 0.4,
        ease: "easeInOut",
        // Use longer exit duration to ensure smooth crossfade
        enter: { duration: 0.4 },
        exit: { duration: 0.3 }
      }}
      style={{ willChange: 'opacity' }}
      className={className || "w-full h-full bg-white"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
