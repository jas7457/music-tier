import type { Metadata, Viewport } from 'next';
import { Pixelify_Sans, Press_Start_2P } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { SpotifyPlayerProvider } from '@/lib/SpotifyPlayerContext';
import { PusherProvider } from '@/lib/PusherContext';
import { ServiceWorkerProvider } from '@/lib/ServiceWorkerContext';
import { Layout } from '@/components/Layout';
import { PopulatedUser } from '@/lib/types';
import { getUserByCookies } from '@/lib/data';
import { cookies } from 'next/headers';
import { DataProvider } from '@/lib/DataContext';
import { ToastProvider } from '@/lib/ToastContext';
import { GameBoyPalette, ThemeProvider } from '@/lib/ThemeContext';
import { APP_NAME } from '@/lib/utils/constants';

const pixel = Pixelify_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixel',
});

const pressStart = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-press-start',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Compete with friends in music discovery leagues',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#cfcbc6',
  viewportFit: 'cover',
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser: PopulatedUser | null = null;
  const cookieStore = await cookies();
  const palette = cookieStore.get('gbPalette')?.value || 'dmg';

  try {
    const sessionToken = cookieStore.get('session_token')?.value;
    if (sessionToken) {
      const user = await getUserByCookies('');
      initialUser = user || null;
    }
  } catch (err) {
    console.log(err);
  }

  return (
    <html
      lang="en"
      className={`${pixel.variable} ${pressStart.variable}`}
      data-gb-palette={palette}
    >
      <head>
        <script src="https://sdk.scdn.co/spotify-player.js" async></script>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <ThemeProvider initialPalette={palette as GameBoyPalette}>
              <ServiceWorkerProvider>
                <PusherProvider>
                  <SpotifyPlayerProvider>
                    <DataProvider>
                      <Layout>{children}</Layout>
                    </DataProvider>
                  </SpotifyPlayerProvider>
                </PusherProvider>
              </ServiceWorkerProvider>
            </ThemeProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
