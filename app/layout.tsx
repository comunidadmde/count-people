import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Door Counter System",
  description: "Track people count for multiple doors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
