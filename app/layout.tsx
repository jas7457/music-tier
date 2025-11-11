import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SpotifyPlayerProvider } from "@/lib/SpotifyPlayerContext";
import { PusherProvider } from "@/lib/PusherContext";
import { Layout } from "@/components/Layout";
import { PopulatedUser } from "@/lib/types";
import { getUserBySessionToken } from "@/lib/data";
import { cookies } from "next/headers";

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
      const user = await getUserBySessionToken(sessionToken);
      initialUser = user || null;
    }
  } catch (err) {
    console.log(err);
  }

  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://sdk.scdn.co/spotify-player.js"></script>
      </head>
      <body>
        <AuthProvider initialUser={initialUser}>
          <PusherProvider>
            <SpotifyPlayerProvider>
              <Layout>{children}</Layout>
            </SpotifyPlayerProvider>
          </PusherProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
