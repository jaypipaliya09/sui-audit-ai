import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WalletContextProvider } from "@/lib/walletContext";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "SuiAudit AI — AI-Powered Security Audits for Sui Move Contracts",
  description:
    "Paste your Sui Move smart contract and get a comprehensive AI security audit in 60 seconds. Findings stored permanently on the Walrus decentralized network.",
  keywords: ["Sui", "Move", "smart contract", "security audit", "AI", "Walrus", "blockchain"],
  openGraph: {
    title: "SuiAudit AI — AI-Powered Move Contract Security",
    description:
      "Get a comprehensive security audit of your Sui Move contract in 60 seconds, stored permanently on Walrus.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}>
      <body
        className="antialiased bg-obsidian text-gray-200 min-h-screen flex flex-col"
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        <AuthProvider>
          <WalletContextProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </WalletContextProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
