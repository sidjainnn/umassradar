import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const bodyFont = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "UMass Radar",
  description: "Everything UMass needs from you, in one place.",
  appleWebApp: { capable: true, title: "Radar", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#840028",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} antialiased`}
      >
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
