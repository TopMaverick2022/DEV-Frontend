import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  hover?: boolean
}

export function GlassCard({ children, className, hover = true, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6 transition-all duration-300',
        hover && 'hover:bg-white/20 dark:hover:bg-black/30 hover:shadow-xl hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function GradientText({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn('bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent', className)}>
      {children}
    </span>
  )
}
