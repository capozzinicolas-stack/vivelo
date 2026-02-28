import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { CatalogProvider } from "@/providers/catalog-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ChatProvider } from "@/providers/chat-provider";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://solovivelo.com'),
  title: {
    default: 'Vivelo - Servicios para Eventos en Mexico',
    template: '%s | Vivelo',
  },
  description: 'Encuentra y reserva los mejores servicios para tu evento en México. Catering, audio, decoracion, fotografia y mas.',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Vivelo',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const isAdminPortal = headersList.get('x-admin-portal') === '1';

  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {gaId && <GoogleAnalytics gaId={gaId} />}
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
            fbq('track', 'PageView');
          `}</Script>
        )}
        <AuthProvider>
          <CatalogProvider>
            {isAdminPortal ? (
              <>
                {children}
                <Toaster />
              </>
            ) : (
              <CartProvider>
                <ChatProvider>
                  <Navbar />
                  <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
                  <Footer />
                  <MobileBottomNav />
                  <Toaster />
                  <ChatBubble />
                </ChatProvider>
              </CartProvider>
            )}
          </CatalogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
