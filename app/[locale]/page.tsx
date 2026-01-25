import DoorCounterDisplay from '../components/DoorCounterDisplay';
import { Link } from '@/i18n/routing';
import { getDatabase } from '@/lib/mongodb';
import { getTranslations } from 'next-intl/server';

// Force dynamic rendering to always show fresh door data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const t = await getTranslations();
  
  // Fetch doors from database
  let doors: { id: string; name: string }[] = [];
  
  try {
    const db = await getDatabase();
    const doorsData = await db.collection('doors').find({}).toArray();
    if (doorsData.length > 0) {
      doors = doorsData.map((door) => ({
        id: door.doorId,
        name: door.doorName,
      }));
    }
  } catch (error) {
    console.error('Error fetching doors:', error);
    // Use default doors on error
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Link
            href="/admin/dashboard"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
          >
            {t('common.admin')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {doors.map((door) => (
            <DoorCounterDisplay
              key={door.id}
              doorId={door.id}
              doorName={door.name}
            />
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {t('home.instructions')}
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>{t('home.instruction1')}</li>
            <li>{t('home.instruction2')}</li>
            <li>{t('home.instruction3')}</li>
            <li>{t('home.instruction4')}</li>
            <li>{t('home.instruction5')}</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
