import DoorCounter from './components/DoorCounter';

export default function Home() {
  const doors = [
    { id: 'door-1', name: 'Main Entrance' },
    { id: 'door-2', name: 'Side Door' },
    { id: 'door-3', name: 'Back Door' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Door Counter System
          </h1>
          <p className="text-xl text-gray-600">
            Track people count for multiple doors
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <a
            href="/admin"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
          >
            Admin Login
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {doors.map((door) => (
            <div key={door.id} className="flex flex-col">
              <DoorCounter
                doorId={door.id}
                doorName={door.name}
              />
              <a
                href={`/door/${door.id}`}
                className="mt-4 text-center text-blue-600 hover:text-blue-800 font-medium"
              >
                View Full Page →
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Instructions
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Click the &quot;Count Person&quot; button to increment the counter</li>
            <li>The count is automatically saved to the database each time you click</li>
            <li>Each door maintains its own independent counter</li>
            <li>Contact an administrator to reset counters or view detailed statistics</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
