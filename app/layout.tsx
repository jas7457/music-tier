import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Music Tier List Maker',
  description: 'Create and customize tier lists for your music rankings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://sdk.scdn.co/spotify-player.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  )
}