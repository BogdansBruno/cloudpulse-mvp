import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import UpdateBanner from "@/components/UpdateBanner";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme-shared";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif for the readiness engine's short verdicts only
// ("Сегодня — день восстановления"). Numbers and labels stay in sans.
// Cyrillic + latin-ext so RU and LV render in the same face.
const adpSerif = Cormorant_Garamond({
  variable: "--font-adp-serif",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lotus",
  description: "AI-powered readiness & burnout-prevention coach for young athletes",
  applicationName: "Lotus",
  // The web app manifest comes from app/manifest.ts; iOS reads these instead.
  appleWebApp: { capable: true, title: "Lotus", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  // Android Chrome / older iOS read this one for "standalone" launch
  other: { "mobile-web-app-capable": "yes" },
};

// viewportFit "cover" lets the app paint under the notch / Dynamic Island; the screens pad themselves with env(safe-area-inset-*).
export const viewport: Viewport = {
  themeColor: "#0B0D11",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The head script sets data-theme before hydration, so the server's
    // "dark" can legitimately differ from what the client ends up with.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${adpSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#0B0D11]">
        <Providers>
          {children}
          <UpdateBanner />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
