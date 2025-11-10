import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { SpotifyPlayerProvider } from "@/lib/SpotifyPlayerContext";
import { Layout } from "@/components/Layout";

export const metadata: Metadata = {
  title: "Music League Now!",
  description: "Compete with friends in music discovery leagues",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://sdk.scdn.co/spotify-player.js"></script>
      </head>
      <body>
        <AuthProvider>
          <SpotifyPlayerProvider>
            <Layout>{children}</Layout>
          </SpotifyPlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
