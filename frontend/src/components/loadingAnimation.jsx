import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

function LoadingAnimation() {
  const thinkingLabels = [
    "Thinking",
    "Analyzing",
    "Reasoning",
    "Generating",
  ];

  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % thinkingLabels.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const label = thinkingLabels[labelIndex];

  return (
    <div className="flex items-center gap-3 py-2">
      
      {/* AI ORB */}
      <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
        
        {/* subtle glow */}
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-cyan-300/20 blur-md"
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* orb */}
        <motion.div
          className="
            relative
            w-2.5
            h-2.5
            rounded-full
            bg-gradient-to-br
            from-cyan-200
            to-pink-200
          "
          style={{
            boxShadow: "0 0 12px rgba(125, 211, 252, 0.45)",
          }}
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* STATUS */}
      <div className="flex items-center gap-2 min-w-[95px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            className="
              text-[13px]
              font-medium
              tracking-wide
              text-slate-400
            "
            initial={{
              opacity: 0,
              y: 4,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -4,
            }}
            transition={{
              duration: 0.25,
              ease: "easeOut",
            }}
          >
            {label}
          </motion.span>
        </AnimatePresence>

        {/* three thinking dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-slate-500"
              animate={{
                opacity: [0.25, 1, 0.25],
                y: [0, -2, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingAnimation;