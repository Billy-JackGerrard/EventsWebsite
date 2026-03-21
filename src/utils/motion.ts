import type { Variants, Transition } from 'framer-motion'

// Shared easing — matches existing --ease-out token: cubic-bezier(0.16, 1, 0.3, 1)
const easeOut: Transition = { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
const easeOutFast: Transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] }

// Style 1: Fade + slide up — all content entrances
// Used for: page views, cards, list items, form sections, modals
export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: easeOut },
}

// Style 2: Scale spring — all interactive elements
// Used for: event cards, buttons, logo brand (hover/tap feedback)
export const scaleSpring = {
  hover: { scale: 1.025, y: -3 },
  tap:   { scale: 0.97 },
}

// Stagger container — wraps lists that use fadeSlideUp children
export const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

// Page-level transitions — signature interaction via AnimatePresence in main.tsx
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, y: -8, transition: easeOutFast },
}

// BSL icon wave — motion.img in Navbar.tsx
// bslWave.animate is a direct animation object (not a variant key string)
export const bslWave = {
  animate: {
    rotate: [0, -12, 10, -6, 4, 0],
    transition: {
      duration: 1.2,
      ease: 'easeInOut' as const,
      repeat: Infinity,
      repeatDelay: 3.8,
    },
  },
  hover: {
    rotate: [0, -15, 12, -8, 0],
    transition: { duration: 0.7, ease: 'easeInOut' as const },
  },
}
