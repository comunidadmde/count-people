import DoorCounter from '@/app/components/DoorCounter';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { getDatabase } from '@/lib/mongodb';
import { getTranslations } from 'next-intl/server';

export default async function DoorPage({
  params,
}: {
  params: Promise<{ doorId: string; locale: string }>;
}) {
  const { doorId } = await params;
  const t = await getTranslations();
  
  // Fetch door info from database
  let doorName = doorId;
  try {
    const db = await getDatabase();
    const door = await db.collection('doors').findOne({ doorId });
    if (door) {
      doorName = door.doorName;
    } else {
      // Fallback to default names if door not in database
      const defaultNames: Record<string, string> = {
        'door-1': 'Main Entrance',
        'door-2': 'Side Door',
        'door-3': 'Back Door',
      };
      doorName = defaultNames[doorId] || doorId;
    }
  } catch (error) {
    console.error('Error fetching door:', error);
    // Use fallback
    const defaultNames: Record<string, string> = {
      'door-1': 'Main Entrance',
      'door-2': 'Side Door',
      'door-3': 'Back Door',
    };
    doorName = defaultNames[doorId] || doorId;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center mb-4"
          >
            {t('door.backToHome')}
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {doorName}
          </h1>
          <p className="text-gray-600">{t('door.counterView')}</p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <DoorCounter doorId={doorId} doorName={doorName} />
          </div>
        </div>
      </div>
    </main>
  );
}
