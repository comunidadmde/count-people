'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS ? parseInt(process.env.POLL_INTERVAL_MS) : 5000;

interface AuditoriumTotals {
  [auditorium: string]: number;
}

export default function RoomTotalsDisplay() {
  const t = useTranslations('display');
  const [totals, setTotals] = useState<AuditoriumTotals | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTotals = async () => {
    try {
      const res = await fetch('/api/counters');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch');
      }
      if (json.success && json.auditoriumTotals) {
        setTotals(json.auditoriumTotals);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading data');
    }
  };

  useEffect(() => {
    fetchTotals();
    const interval = setInterval(fetchTotals, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8">
        <div className="text-center text-red-400 text-2xl">
          <p>{t('error')}</p>
          <p className="text-lg mt-2 opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  const entries = totals
    ? Object.entries(totals).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="bg-slate-900 text-white">
      {entries.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center p-8">
          <p className="text-slate-400 text-2xl md:text-4xl text-center">{t('noRooms')}</p>
        </div>
      ) : (
        entries.reverse().map(([roomName, count]) => (
          <section
            key={roomName}
            className="h-screen w-full flex flex-col items-center justify-center p-6 md:p-10"
          >
            <p className="text-slate-400 text-lg md:text-xl mb-6 md:mb-8 text-center">
              {t('showingTotalPeopleIn')} <span className="text-slate-300 font-medium">{roomName}</span>
            </p>
            <p className="text-[6rem] md:text-[10rem] lg:text-[14rem] xl:text-[18rem] font-bold text-indigo-400 tabular-nums leading-none text-center">
              {count}
            </p>
            <p className="text-slate-500 text-2xl md:text-3xl lg:text-4xl mt-6">{t('people')}</p>
            {lastUpdated && (
              <p className="text-slate-500 text-sm mt-6 opacity-80">
                {t('lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </section>
        ))
      )}
    </div>
  );
}
