import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : null;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  title: "Resto SaaS — Commande digitale par QR code",
  description:
    "Vos clients scannent le QR code, commandent depuis leur téléphone. Vous recevez la commande en temps réel avec notification sonore. Menu digital, gestion de stock, statistiques. Conçu pour les restaurants en Afrique.",
  metadataBase: new URL("https://resto-saas.com"),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Resto SaaS — Commande digitale par QR code",
    description:
      "QR code sur chaque table, menu digital, commandes en temps réel. La solution tout-en-un pour digitaliser votre restaurant.",
    url: "https://resto-saas.com",
    siteName: "Resto SaaS",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Resto SaaS" }],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Resto SaaS — Commande digitale par QR code",
    description:
      "QR code sur chaque table, menu digital, commandes en temps réel.",
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-maskable-192.png" />
        {supabaseHost && (
          <>
            <link rel="preconnect" href={supabaseHost} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseHost} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-950">
        {children}
      </body>
    </html>
  );
}
