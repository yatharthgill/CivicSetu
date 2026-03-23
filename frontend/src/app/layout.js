import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import PWARegister from "../components/PWARegister";
import LiveUpdatesBridge from "../components/LiveUpdatesBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CivicSetu",
  description: "Report and track civic issues in your city",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CivicSetu",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/civicsetu-icon.svg",
    apple: "/icons/civicsetu-icon.svg",
  },
};

export const viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <PWARegister />
        <Providers>
          <AuthProvider>
            <LiveUpdatesBridge />
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
