import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Data Analyst — Natural Language Business Intelligence",
  description:
    "Chat with your spreadsheets and databases. Generate SQL, visualize data, and surface business insights instantly.",
  keywords: ["AI", "data analyst", "SQL", "dashboard", "business intelligence"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.variable}>
        <div className="mesh-bg" />
        {children}
      </body>
    </html>
  );
}
