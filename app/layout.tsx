import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PacePact — Train Together',
  description: 'AI-powered group training plans for endurance events. Keep each other accountable.',
  icons: { icon: '/favicon.svg' },
}

const themeScript = `
  try {
    const t = localStorage.getItem('theme')
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch {}
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
