import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SpotifyPlayerProvider } from "@/lib/SpotifyPlayerContext";
import { PusherProvider } from "@/lib/PusherContext";
import { Layout } from "@/components/Layout";
import { PopulatedUser } from "@/lib/types";
import { getUserByCookies } from "@/lib/data";
import { cookies } from "next/headers";
import { DataProvider } from "@/lib/DataContext";
import { ToastProvider } from "@/lib/ToastContext";

export const metadata: Metadata = {
  title: "Music League Now!",
  description: "Compete with friends in music discovery leagues",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser: PopulatedUser | null = null;
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (sessionToken) {
      const user = await getUserByCookies();
      initialUser = user || null;
    }
  } catch (err) {
    console.log(err);
  }

  return (
    <html lang="en">
      <head>
        <script src="https://sdk.scdn.co/spotify-player.js" async></script>
      </head>
      <body>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <PusherProvider>
              <SpotifyPlayerProvider>
                <DataProvider>
                  <Layout>{children}</Layout>
                </DataProvider>
              </SpotifyPlayerProvider>
            </PusherProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
