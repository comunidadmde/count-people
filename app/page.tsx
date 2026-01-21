import DoorCounterDisplay from './components/DoorCounterDisplay';
import Link from 'next/link';
import { getDatabase } from '@/lib/mongodb';

// Force dynamic rendering to always show fresh door data
export const dynamic = 'force-dynamic';

export default async function Home() {
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
            Comunidad&apos;s Door Counter System
          </h1>
          <p className="text-xl text-gray-600">
            Track people count for multiple doors and auditoriums
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Link
            href="/admin/dashboard"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
          >
            Admin
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
            Instructions
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Click on a door card to go to its counter page</li>
            <li>On the counter page, click the &quot;Count Person&quot; button to increment</li>
            <li>All clicks are automatically saved, even with slow internet connections</li>
            <li>Each door maintains its own independent counter</li>
            <li>Contact an administrator to reset counters or view detailed statistics</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
