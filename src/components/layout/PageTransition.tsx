
import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ 
        duration: 0.15,
        ease: "easeInOut"
      }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
