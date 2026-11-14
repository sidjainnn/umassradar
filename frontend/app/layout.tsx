import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const bodyFont = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});
const displayFont = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "UMass Radar",
  description: "Everything UMass needs from you, in one place.",
  appleWebApp: { capable: true, title: "Radar", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6557E8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
      >
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
