import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/AuthContext'
import { SpotifyPlayerProvider } from '@/lib/SpotifyPlayerContext'

export const metadata: Metadata = {
  title: 'Music League',
  description: 'Compete with friends in music discovery leagues',
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
      <body>
        <AuthProvider>
          <SpotifyPlayerProvider>
            {children}
          </SpotifyPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  )
}