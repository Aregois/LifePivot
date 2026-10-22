import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Armenian } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

const notoArmenian = Noto_Sans_Armenian({
  variable: "--font-noto-armenian",
  subsets: ["armenian"],
});

import { createClient } from "@/utils/supabase/server";
import { EconomyProvider } from "@/components/economy-provider";
import { RegisterServiceWorker } from "@/components/register-sw";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ThemeInitializer } from "@/components/theme-initializer";
import { LanguageProvider } from "@/components/language-provider";
import { WebDebugPanel } from "@/components/web-debug-panel";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lifepivot.app"),
  title: {
    default: "LifePivot — AI-Powered Adaptive Learning & Habit Engine",
    template: "%s | LifePivot",
  },
  description: "Turn any ambitious goal into an adaptive day-by-day execution plan with Socratic AI tutoring, Active Recall drills, and streak protection.",
  manifest: "/manifest.json",
  openGraph: {
    title: "LifePivot — AI-Powered Adaptive Learning & Habit Engine",
    description: "Turn any ambitious goal into an adaptive day-by-day execution plan with Socratic AI tutoring, Active Recall drills, and streak protection.",
    url: "https://lifepivot.app",
    siteName: "LifePivot",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "LifePivot",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LifePivot — AI-Powered Adaptive Learning & Habit Engine",
    description: "Turn any ambitious goal into an adaptive day-by-day execution plan with Socratic AI tutoring and Active Recall drills.",
    images: ["/icon-512.png"],
  },
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
  let user = null;
  let initialTokens = 0;
  let initialGems = 3;
  let initialVoidDays = 0;
  let initialXp = 0;
  let initialLevel = 1;

  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;

    if (user) {
      const [{ data: profile }, { data: voidDaysData }] = await Promise.all([
        supabase.from("profiles").select("tokens_balance, gems, xp, level").eq("id", user.id).single(),
        supabase.from("tasks").select("id").eq("user_id", user.id).eq("priority", 0).eq("status", "pending")
      ]);

      if (profile) {
        initialTokens = profile.tokens_balance ?? 0;
        initialGems = profile.gems ?? 3;
        initialXp = profile.xp ?? 0;
        initialLevel = profile.level ?? 1;
      }
      if (voidDaysData) {
        initialVoidDays = voidDaysData.length;
      }
    }
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE") throw err;
    console.error("[RootLayout] Failed to initialize user session:", err);
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoArmenian.variable} antialiased selection:bg-neon-violet selection:text-white`}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <ThemeInitializer />
          <RegisterServiceWorker />
          <PwaInstallPrompt />
          {user ? (
            <EconomyProvider
              initialTokens={initialTokens}
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
        <WebDebugPanel />
      </body>
    </html>
  );
}
