import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "UMass Radar",
  description: "Everything UMass needs from you, in one place.",
  appleWebApp: { capable: true, title: "Radar", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#881C1C",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
