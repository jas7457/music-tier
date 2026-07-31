import type { Metadata, Viewport } from 'next';
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
import { ThemeProvider } from '@/lib/ThemeContext';
import { APP_NAME } from '@/lib/utils/constants';

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
  themeColor: '#008080',
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
  // The colour scheme now drives the title bars, the way Appearance did in 98.
  const primaryColor = cookieStore.get('primaryColor')?.value || 'blue';

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
    <html lang="en">
      <head>
        <script src="https://sdk.scdn.co/spotify-player.js" async></script>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root {
            --color-primary-lightest: var(--color-${primaryColor}-100);
            --color-primary-lighter: var(--color-${primaryColor}-200);
            --color-primary-light: var(--color-${primaryColor}-500);
            --color-primary: var(--color-${primaryColor}-900);
            --color-primary-dark: var(--color-${primaryColor}-900);
            --color-primary-darker: var(--color-${primaryColor}-950);
            --color-primary-darkest: var(--color-${primaryColor}-950);
          }`,
          }}
        />
      </head>
      <body>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <ThemeProvider initialColor={primaryColor as any}>
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
