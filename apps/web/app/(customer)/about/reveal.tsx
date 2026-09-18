'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Fade-up on scroll. Children are still server-rendered into the HTML. */
export function Reveal({
  children,
  delay = 0,
  lift = false,
  className,
}: {
  children: ReactNode;
  delay?: number;
  /** Card-style hover lift. */
  lift?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={lift && !reduced ? { y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' } : undefined}
    >
      {children}
    </motion.div>
  );
}
