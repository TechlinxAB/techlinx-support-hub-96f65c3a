
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
        duration: 0.3, 
        ease: "easeInOut",
      }}
      style={{ 
        willChange: 'opacity',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
      }}
      className={className || "w-full h-full bg-white"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
