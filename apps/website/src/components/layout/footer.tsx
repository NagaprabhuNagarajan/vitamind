import Image from 'next/image'

const FOOTER_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface-secondary">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Image src="/logo.png" alt="VitaMind" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-bold text-white">VitaMind</span>
            </div>
            <p className="text-sm text-gray-500">
              Intelligence for your life.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.04] text-center">
          <p className="text-xs text-gray-600">
            &copy; 2025 VitaMind. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
