import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { createClient } from "@/utils/supabase/server";
import { EconomyProvider } from "@/components/economy-provider";
import { RegisterServiceWorker } from "@/components/register-sw";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeInitializer } from "@/components/theme-initializer";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "LifePivot - Adaptive Learning",
  description: "A gamified, adaptive task manager and learning plan creator.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifePivot",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
      }
    ]
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initialLives = 3;
  let initialGems = 3;
  let initialVoidDays = 0;
  let initialXp = 0;
  let initialLevel = 1;

  if (user) {
    const [{ data: profile }, { data: voidDaysData }] = await Promise.all([
      supabase.from("profiles").select("lives, gems, xp, level").eq("id", user.id).single(),
      supabase.from("tasks").select("id").eq("user_id", user.id).eq("priority", 0).eq("status", "pending")
    ]);

    if (profile) {
      initialLives = profile.lives;
      initialGems = profile.gems;
      initialXp = profile.xp ?? 0;
      initialLevel = profile.level ?? 1;
    }
    if (voidDaysData) {
      initialVoidDays = voidDaysData.length;
    }
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-neon-violet selection:text-white`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <ThemeInitializer />
          <RegisterServiceWorker />
          <PwaInstallPrompt />
          {user ? (
            <EconomyProvider
              initialLives={initialLives}
              initialGems={initialGems}
              initialVoidDays={initialVoidDays}
              initialXp={initialXp}
              initialLevel={initialLevel}
            >
              {children}
            </EconomyProvider>
          ) : (
            children
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
