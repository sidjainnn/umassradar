import type { Metadata, Viewport } from "next";
import { Lora, Open_Sans } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

// UMass Amherst's approved digital fonts
const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${openSans.variable} ${lora.variable} font-sans antialiased`}>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
