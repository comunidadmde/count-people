import type { Metadata } from "next";
import "./globals.css";
import { getMessages } from 'next-intl/server';
import { defaultLocale } from "@/i18n";
import Providers from './providers';
import LanguageSwitcher from './components/LanguageSwitcher';

export const metadata: Metadata = {
  title: "Door Counter System",
  description: "Track people count for multiple doors",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load default messages (Spanish) - will be overridden by Providers if user has saved preference
  const messages = await getMessages();

  return (
    <html lang={defaultLocale}>
      <body className="antialiased">
        <Providers messages={messages}>
          <div className="fixed top-4 right-4 z-50">
            <LanguageSwitcher />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
