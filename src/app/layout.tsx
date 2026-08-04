'use client'

import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToasterProvider } from '@/components/ui/Toast'

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>TwinLab - Digital Twin Platform</title>
        <meta name="description" content="Enterprise cloud-based digital twin platform for computer lab monitoring" />
      </head>
      <body className="bg-brand-dark-bg text-brand-dark-text">
        <ThemeProvider>
          <AuthProvider>
            <ToasterProvider>
              {children}
            </ToasterProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
