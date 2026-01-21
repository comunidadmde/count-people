import Link from 'next/link';

interface DoorCounterDisplayProps {
  doorId: string;
  doorName: string;
}

export default function DoorCounterDisplay({
  doorId,
  doorName,
}: DoorCounterDisplayProps) {
  return (
    <Link
      href={`/door/${doorId}`}
      className="block bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all transform hover:scale-105"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{doorName}</h2>
        <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold text-lg">
          <span>Go to Counter</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
