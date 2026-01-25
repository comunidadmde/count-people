import { getRequestConfig } from 'next-intl/server';

// Supported locales with Spanish as default
export const locales = ['es', 'en'] as const;
export const defaultLocale = 'es' as const;

export default getRequestConfig(async ({ requestLocale }) => {
  // Use Spanish as default (language switching is handled client-side via localStorage)
  // The Providers component will override this on the client side
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'America/Mexico_City', // Set timezone to avoid SSR/client mismatches
    now: new Date() // Provide explicit now to avoid ENVIRONMENT_FALLBACK during static generation
  };
});
