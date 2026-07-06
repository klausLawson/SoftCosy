'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface ThemeColors {
  primary: string
  accent: string
}

interface ThemeColorsContextType {
  colors: ThemeColors
  setColors: (colors: ThemeColors) => void
  presets: { name: string; primary: string; accent: string }[]
}

const ThemeColorsContext = createContext<ThemeColorsContextType | undefined>(undefined)

const COLOR_PRESETS = [
  { name: 'Bleu Royal', primary: 'oklch(0.45 0.19 262.67)', accent: 'oklch(0.65 0.2 42.04)' },
  { name: 'Émeraude', primary: 'oklch(0.52 0.18 162)', accent: 'oklch(0.72 0.17 85)' },
  { name: 'Améthyste', primary: 'oklch(0.45 0.22 292)', accent: 'oklch(0.65 0.18 200)' },
  { name: 'Framboise', primary: 'oklch(0.52 0.22 340)', accent: 'oklch(0.6 0.18 178)' },
  { name: 'Océan', primary: 'oklch(0.6 0.2 220)', accent: 'oklch(0.6 0.22 10)' },
]

export function ThemeColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>({
    primary: 'oklch(0.45 0.19 262.67)',
    accent: 'oklch(0.65 0.2 42.04)',
  })
  const [mounted, setMounted] = useState(false)

  // Charger les couleurs de localStorage au montage
  useEffect(() => {
    const savedColors = localStorage.getItem('softcosy_theme_colors')
    if (savedColors) {
      try {
        setColorsState(JSON.parse(savedColors))
      } catch (error) {
        console.error('Failed to load colors:', error)
      }
    }
    setMounted(true)
  }, [])

  // Appliquer les couleurs aux variables CSS quand elles changent
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Injecter les variables CSS dynamiquement
    let existingStyle = document.getElementById('softcosy-theme-vars')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    const style = document.createElement('style')
    style.id = 'softcosy-theme-vars'
    style.innerHTML = `
      :root {
        --primary: ${colors.primary} !important;
        --accent: ${colors.accent} !important;
        --color-primary: ${colors.primary} !important;
        --color-accent: ${colors.accent} !important;
        --ring: ${colors.primary} !important;
        --sidebar-primary: ${colors.primary} !important;
        --sidebar-primary-foreground: #ffffff !important;
      }
      .dark {
        --primary: ${colors.primary} !important;
        --accent: ${colors.accent} !important;
        --color-primary: ${colors.primary} !important;
        --color-accent: ${colors.accent} !important;
        --ring: ${colors.primary} !important;
        --sidebar-primary: ${colors.primary} !important;
        --sidebar-primary-foreground: #ffffff !important;
      }
    `
    document.head.appendChild(style)

    localStorage.setItem('softcosy_theme_colors', JSON.stringify(colors))
  }, [colors, mounted])

  const setColors = (newColors: ThemeColors) => {
    setColorsState(newColors)
  }

  return (
    <ThemeColorsContext.Provider
      value={{
        colors,
        setColors,
        presets: COLOR_PRESETS,
      }}
    >
      {children}
    </ThemeColorsContext.Provider>
  )
}

export function useThemeColors() {
  const context = useContext(ThemeColorsContext)
  if (context === undefined) {
    throw new Error('useThemeColors must be used within ThemeColorsProvider')
  }
  return context
}
