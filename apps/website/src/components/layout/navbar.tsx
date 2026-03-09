'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useSpring } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { clsx } from 'clsx'
import Image from 'next/image'

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Magnetic hover state for Join Beta button
  const btnRef = useRef<HTMLAnchorElement>(null)
  const btnX = useSpring(0, { stiffness: 150, damping: 15 })
  const btnY = useSpring(0, { stiffness: 150, damping: 15 })

  function onBtnMouseMove(e: React.MouseEvent) {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left - rect.width / 2) * 0.3
    const relY = (e.clientY - rect.top - rect.height / 2) * 0.3
    btnX.set(relX)
    btnY.set(relY)
  }

  function onBtnMouseLeave() {
    btnX.set(0)
    btnY.set(0)
  }

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-black/40 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Image src="/logo.png" alt="VitaMind" width={32} height={32} className="rounded-xl" />
          </motion.div>
          <span className="text-lg font-bold text-white">VitaMind</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <motion.a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors"
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
            >
              {link.label}
            </motion.a>
          ))}
          {/* Magnetic hover Join Beta button */}
          <motion.a
            ref={btnRef}
            href="#waitlist"
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2 text-sm font-semibold text-white transition-all"
            style={{ x: btnX, y: btnY }}
            onMouseMove={onBtnMouseMove}
            onMouseLeave={onBtnMouseLeave}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            Join Beta
          </motion.a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-gray-400 hover:text-white"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile dropdown with smooth animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="md:hidden bg-black/80 backdrop-blur-xl border-t border-white/[0.06] px-6 pb-6 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block py-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#waitlist"
              onClick={() => setIsOpen(false)}
              className="mt-2 block rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Join Beta
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
