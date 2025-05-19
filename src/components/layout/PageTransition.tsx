
import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 0 }}
      transition={{ 
        duration: 0.12,
        ease: "linear"
      }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
