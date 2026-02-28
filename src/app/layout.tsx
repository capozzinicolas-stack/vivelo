import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
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
  title: "Vivelo - Servicios para Eventos en Mexico",
  description: "Encuentra y reserva los mejores servicios para tu evento en México. Catering, audio, decoracion, fotografia y mas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = headers();
  const isAdminPortal = headersList.get('x-admin-portal') === '1';

  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
