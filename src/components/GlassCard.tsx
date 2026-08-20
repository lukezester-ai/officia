// @ts-nocheck
"use client"

import * as React from "react"

export interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div
      className={`backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 shadow-lg hover:scale-[1.02] transition-transform duration-300 ${className}`}
    >
      {children}
    </div>
  )
}

export default GlassCard
