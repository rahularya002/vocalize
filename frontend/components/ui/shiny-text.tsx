"use client";

import { motion } from "framer-motion";

interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function ShinyText({ text, className = "", speed = 3 }: ShinyTextProps) {
  return (
    <motion.span
      className={`inline-block text-transparent bg-clip-text ${className}`}
      style={{
        backgroundImage: "linear-gradient(120deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 70%)",
        backgroundSize: "200% auto",
        color: "inherit",
        WebkitBackgroundClip: "text",
        backgroundClip: "text"
      }}
      animate={{
        backgroundPosition: ["200% center", "-200% center"],
      }}
      transition={{
        repeat: Infinity,
        repeatType: "loop",
        duration: speed,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}
