import { Variants } from 'framer-motion';

export const pageTransition: Variants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.1 } }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.1 } }
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.1 } }
};

export const modalPopup: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15, ease: 'easeIn' } }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 }
};

export const hoverLift: Variants = {
  initial: { opacity: 0, y: 0 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.98 }
};

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 25
};

export const smoothTransition = {
  duration: 0.3,
  ease: 'easeOut'
};
