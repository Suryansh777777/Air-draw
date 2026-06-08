import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://air-draw.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Air Draw — paint light in the air with your hands",
  description:
    "Raise a hand to your webcam and point — your fingertip becomes a pen and you draw glowing light in the air. Open your other palm to summon a colour wheel and dip your finger in. A hand-tracked light-painting studio in your browser.",
  keywords: [
    "air draw",
    "light painting",
    "hand tracking",
    "webcam",
    "creative coding",
    "generative art",
    "MediaPipe",
    "interactive",
    "neon",
    "browser",
  ],
  authors: [{ name: "Suryansh Chourasia", url: "https://github.com/Suryansh777777" }],
  creator: "Suryansh Chourasia",
  openGraph: {
    title: "Air Draw — paint light in the air",
    description:
      "Point to paint, open your palm for colour. A hand-tracked light-painting studio that runs entirely in your browser.",
    url: SITE_URL,
    siteName: "Air Draw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Air Draw — paint light in the air",
    description: "Point to paint, open your palm for colour. Light-painting with your bare hands, in the browser.",
    creator: "@Suryansh777777",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>{children}</body>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
    </html>
  );
}
