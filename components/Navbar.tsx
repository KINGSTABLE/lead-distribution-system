'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, LayoutDashboard, Wrench, Zap } from 'lucide-react'

const links = [
  { href: '/request-service', label: 'Request Service', icon: Package },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/test-tools', label: 'Test Tools', icon: Wrench },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: 'rgba(17, 24, 39, 0.95)',
        borderBottom: '1px solid #1f2937',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Prowider
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              LDS
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: active ? '#93c5fd' : '#9ca3af',
                    background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: active ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
