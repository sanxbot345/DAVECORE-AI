import React from 'react';
import { motion } from 'motion/react';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2.5 w-full py-2 pl-1">
      <div className="flex items-center gap-1.5 bg-transparent px-4 py-2.5 rounded-2xl">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-teal-600 dark:bg-teal-500 rounded-full"
            animate={{
              y: ["0px", "-6px", "0px"]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15
            }}
          />
        ))}
      </div>
    </div>
  );
}


