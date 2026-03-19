import { cn } from '@/lib/utils'

interface DevLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showIcon?: boolean
  className?: string
}

const sizeMap = {
  sm: { text: 'text-lg', icon: 20, bracket: 'text-base' },
  md: { text: 'text-2xl', icon: 26, bracket: 'text-xl' },
  lg: { text: 'text-3xl', icon: 32, bracket: 'text-2xl' },
  xl: { text: 'text-5xl', icon: 48, bracket: 'text-4xl' },
}

export function DevLogo({ size = 'md', showIcon = true, className }: DevLogoProps) {
  const s = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      {showIcon && <LogoIcon size={s.icon} />}
      <span className={cn('font-bold tracking-tight leading-none', s.text)}>
        <span className="text-foreground font-light">Developer</span>
        <span
          className="font-extrabold bg-gradient-to-br from-primary via-blue-500 to-cyan-400 bg-clip-text text-transparent"
          style={{ fontStyle: 'italic', letterSpacing: '-0.02em' }}
        >
          Ev
        </span>
      </span>
    </div>
  )
}

function LogoIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />

      {/* Left bracket < */}
      <path
        d="M16 12 L9 20 L16 28"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Right bracket > */}
      <path
        d="M24 12 L31 20 L24 28"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />

      {/* Center dot — the "Ev" accent */}
      <circle cx="20" cy="20" r="2.2" fill="white" />
    </svg>
  )
}
