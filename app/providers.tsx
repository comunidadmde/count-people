'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { defaultLocale, locales } from '@/i18n';

interface ProvidersProps {
  children: ReactNode;
  messages: any;
}

export default function Providers({ children, messages }: ProvidersProps) {
  const [locale, setLocale] = useState<string>(defaultLocale);
  const [currentMessages, setCurrentMessages] = useState(messages);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Get locale from localStorage on mount
    const savedLocale = localStorage.getItem('app-locale');
    if (savedLocale && locales.includes(savedLocale as any)) {
      setLocale(savedLocale);
      // Load messages for the saved locale
      import(`@/messages/${savedLocale}.json`).then((module) => {
        setCurrentMessages(module.default);
      }).catch(() => {
        // Fallback to default if import fails
        setCurrentMessages(messages);
      });
    }

    // Listen for locale changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-locale' && e.newValue && locales.includes(e.newValue as any)) {
        setLocale(e.newValue);
        import(`@/messages/${e.newValue}.json`).then((module) => {
          setCurrentMessages(module.default);
        }).catch(() => {
          setCurrentMessages(messages);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab locale changes
    const handleLocaleChange = (e: CustomEvent) => {
      const newLocale = e.detail;
      if (locales.includes(newLocale as any)) {
        setLocale(newLocale);
        import(`@/messages/${newLocale}.json`).then((module) => {
          setCurrentMessages(module.default);
        }).catch(() => {
          setCurrentMessages(messages);
        });
      }
    };

    window.addEventListener('locale-change', handleLocaleChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('locale-change', handleLocaleChange as EventListener);
    };
  }, [messages]);

  // Use default messages during SSR
  if (!isClient) {
    return (
      <NextIntlClientProvider locale={defaultLocale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={currentMessages}>
      {children}
    </NextIntlClientProvider>
  );
}
