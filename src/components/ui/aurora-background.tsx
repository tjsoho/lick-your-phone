"use client";

import React from "react";
import { motion } from "framer-motion";

export interface AuroraBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  gradientColors?: [string, string];
  pulseDuration?: number;
  ariaLabel?: string;
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  className = "",
  children,
  gradientColors = [
    "var(--aurora-color1, rgba(255,255,255,0.25))",
    "var(--aurora-color2, rgba(146,214,69,0.2))",
  ],
  pulseDuration = 10,
  ariaLabel = "Animated aurora background",
}) => {
  const [colorA, colorB] = gradientColors;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative flex flex-col min-h-screen w-full items-stretch justify-start bg-brand-black text-slate-50 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Pulsing radial gradients */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              radial-gradient(circle, ${colorA} 0%, transparent 70%),
              radial-gradient(circle, ${colorB} 0%, transparent 70%)
            `,
            backgroundSize: "100% 100%",
            animation: `aurora-pulse ${pulseDuration}s ease-in-out infinite`,
          }}
        />

        {/* Blurred orbs — white, green, dark; continuous grow/shrink */}
        <motion.div
          className="absolute inset-0 mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-50"
            style={{ backgroundColor: "rgba(255,255,255,0.4)" }}
            animate={{
              x: [-50, 50, -50],
              y: [-20, 20, -20],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full filter blur-3xl opacity-50"
            style={{ backgroundColor: "rgba(146,214,69,0.5)" }}
            animate={{
              x: [50, -50, 50],
              y: [20, -20, 20],
              scale: [1, 1.6, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/3 left-1/3 w-1/3 h-1/3 rounded-full filter blur-3xl opacity-40"
            style={{ backgroundColor: "rgba(18,23,23,0.6)" }}
            animate={{
              x: [20, -20, 20],
              y: [-30, 30, -30],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/4 w-1/4 h-1/4 rounded-full filter blur-3xl opacity-35"
            style={{ backgroundColor: "rgba(146,214,69,0.45)" }}
            animate={{
              x: [-30, 30, -30],
              y: [10, -10, 10],
              scale: [1, 1.7, 1],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/4 w-1/4 h-1/4 rounded-full filter blur-3xl opacity-30"
            style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
            animate={{
              x: [20, -20, 20],
              y: [-15, 15, -15],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      <div className="relative z-20 w-full flex-1 isolate">{children}</div>
    </div>
  );
};

export default AuroraBackground;
