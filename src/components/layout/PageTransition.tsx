
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
        duration: 0.2, // Faster transition to reduce flash
        ease: "easeInOut",
      }}
      style={{ 
        willChange: 'opacity',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'white !important', // Force white background
        zIndex: 2, // Higher than sidebar but lower than loading overlay
      }}
      className={`${className || "w-full h-full"} bg-white`}
    >
      {/* Extra white wrapper to ensure no green shows through */}
      <div className="bg-white w-full h-full" style={{ backgroundColor: 'white !important' }}> 
        {/* Add another white layer for extra protection against green showing through */}
        <div className="bg-white w-full h-full" style={{ backgroundColor: 'white !important' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default PageTransition;
