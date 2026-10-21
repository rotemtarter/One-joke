import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import TopBar from "./components/TopBar";
import "./globals.css";

// Inter covers Latin text; Hebrew glyphs fall back to Heebo (see globals.css).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "One Joke",
  description: "בדיחה אחת בעברית, בנושא שתבחרו",
  appleWebApp: {
    capable: true,
    title: "One Joke",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${heebo.variable}`}>
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
