
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
        backgroundColor: 'white !important', 
        zIndex: 1,
      }}
      className={`${className || "w-full h-full"} bg-white loading-wrapper`} 
    >
      <div className="bg-white w-full h-full" style={{ backgroundColor: 'white !important' }}> 
        {children}
      </div>
    </motion.div>
  );
};

export default PageTransition;
