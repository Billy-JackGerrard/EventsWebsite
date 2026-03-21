import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

interface SmoothScrollProps {
  children: React.ReactNode
}

// Module-level ref so navigation handlers can reach the Lenis instance
let _lenis: Lenis | null = null

/** Instantly scroll to the top of the page, bypassing Lenis's lerp animation. */
export function scrollToTopInstant() {
  if (_lenis) {
    _lenis.scrollTo(0, { immediate: true })
  } else {
    window.scrollTo(0, 0)
  }
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const lenis = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
      touchMultiplier: 1.5,
      prevent: (node: Element) => {
        const overflowY = getComputedStyle(node).overflowY
        return overflowY === 'auto' || overflowY === 'scroll'
      },
    })
    lenisRef.current = lenis
    _lenis = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      _lenis = null
    }
  }, [])

  return <>{children}</>
}
