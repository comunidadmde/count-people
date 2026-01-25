'use client';

import { useState, useEffect } from 'react';
import { locales, defaultLocale } from '@/i18n';

export default function LanguageSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<string>(defaultLocale);

  useEffect(() => {
    // Get locale from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('app-locale');
      if (savedLocale && locales.includes(savedLocale as any)) {
        setCurrentLocale(savedLocale);
      }
    }
  }, []);

  const changeLanguage = (newLocale: string) => {
    if (typeof window !== 'undefined' && locales.includes(newLocale as any)) {
      localStorage.setItem('app-locale', newLocale);
      setCurrentLocale(newLocale);
      
      // Dispatch custom event to update providers
      window.dispatchEvent(new CustomEvent('locale-change', { detail: newLocale }));
      
      // Reload the page to apply the new language
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={currentLocale}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
