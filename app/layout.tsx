import type {Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import { Providers } from "./components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f17"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
