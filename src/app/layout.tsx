import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import {
  Hind_Siliguri,
  Noto_Sans_Bengali,
  Pacifico,
  Playfair_Display,
  Bebas_Neue,
  Lobster,
  Caveat,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { CartProvider } from "@/components/cart/cart-context";
import { ToastProvider } from "@/components/toast-provider";
import { NavigationProgress } from "@/components/navigation-progress";
import { SITE } from "@/lib/constants";

const body = Noto_Sans_Bengali({
  variable: "--font-body",
  subsets: ["latin", "bengali"],
  display: "swap",
});

const display = Hind_Siliguri({
  variable: "--font-display",
  subsets: ["latin", "bengali"],
  // 400 + 700 cover every heading weight actually used; 500/600 were downloaded
  // but never rendered as display type.
  weight: ["400", "700"],
  display: "swap",
});

/**
 * Optional "message on cake" faces, picked in the custom order form.
 * Each exposes a CSS variable the 3D preview references by name.
 */
const scriptFont = Pacifico({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const serifFont = Playfair_Display({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const blockFont = Bebas_Neue({
  variable: "--font-block",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const lobsterFont = Lobster({
  variable: "--font-lobster",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const handFont = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffafc" },
    { media: "(prefers-color-scheme: dark)", color: "#100b14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "cake order Bangladesh",
    "custom cake Dhaka",
    "birthday cake online",
    "anniversary cake",
    "Super Cake",
    "কেক অর্ডার",
    "কাস্টম কেক",
  ],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${scriptFont.variable} ${serifFont.variable} ${blockFont.variable} ${lobsterFont.variable} ${handFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <CartProvider>
            {/* NavigationProgress reads useSearchParams, which must sit inside a
                Suspense boundary or prerendering the (now static) routes fails. */}
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
          </CartProvider>
        </ThemeProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
