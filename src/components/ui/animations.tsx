"use client"

import { motion} from "framer-motion"
import { ReactNode } from "react"

/**
 * Fade In com slide
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  direction = "up",
}: {
  children: ReactNode
  delay?: number
  duration?: number
  direction?: "up" | "down" | "left" | "right"
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, ...directions[direction] }}
      transition={{ duration, delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Scale In (para dialogs)
 */
export function ScaleIn({
  children,
  delay = 0,
}: {
  children: ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger Container (para listas)
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.05,
}: {
  children: ReactNode
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger Item (para usar dentro do StaggerContainer)
 */
export function StaggerItem({
  children,
  direction = "up",
}: {
  children: ReactNode
  direction?: "up" | "down" | "left" | "right"
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, ...directions[direction] },
        visible: { opacity: 1, y: 0, x: 0 },
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Page Transition
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Hover Scale SIMPLES (sem conflitos)
 */
export function HoverScale({ children }: { children: ReactNode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      style={{ height: "100%" }} // Para não quebrar layout
    >
      {children}
    </motion.div>
  )
}