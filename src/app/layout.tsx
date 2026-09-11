import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";
import PWAUpdateManager from "@/components/gradeup/pwa-update-manager";
import OfflineSyncManager from "@/components/gradeup/offline-sync-manager";

// Local fallback variables to guarantee 100% offline build capability without network dependencies
const geistSans = {
  variable: "--font-geist-sans",
};

const geistMono = {
  variable: "--font-geist-mono",
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export const metadata: Metadata = {
  title: "GradeUp – Plateforme Scolaire Intelligente",
  description: "GradeUp est une plateforme intelligente pour gérer votre école, suivre les performances, gérer les paiements et utiliser l'IA Gradie.",
  keywords: ["GradeUp", "école", "school management", "Axion Labs Technologies"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gradeup-trho.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'GradeUp – Plateforme Scolaire Intelligente',
    description: 'Gestion scolaire, notes, présences et bulletins dans une seule application.',
    siteName: 'GradeUp',
    images: [{ url: '/logo-gradeup.png', width: 512, height: 512, alt: 'Logo GradeUp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GradeUp – Plateforme Scolaire Intelligente',
    description: 'Gestion scolaire, notes, présences et bulletins.',
    images: ['/logo-gradeup.png'],
  },
  authors: [{ name: "Axion Labs Technologies" }],
  icons: {
    icon: "/logo-gradeup.png",
    apple: "/icon-192x192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <PWAUpdateManager />
          <OfflineSyncManager />
          <Toaster />
          <Script
            id="sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('[PWA] Service Worker registered successfully:', reg.scope);
                    }).catch(function(err) {
                      console.warn('[PWA] Service Worker registration failed:', err);
                    });
                  });
                }
              `
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
