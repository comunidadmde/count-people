'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CounterData {
  _id: string;
  doorId: string;
  count: number;
  timestamp: string;
}

interface DoorSummary {
  doorId: string;
  doorName: string;
  latestCount: number;
  lastUpdated: string | null;
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const [doors, setDoors] = useState<DoorSummary[]>([]);
  const [allCounters, setAllCounters] = useState<CounterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const doorNames: Record<string, string> = {
    'door-1': 'Main Entrance',
    'door-2': 'Side Door',
    'door-3': 'Back Door',
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/counters');
      const result = await response.json();

      if (result.success) {
        setAllCounters(result.data);

        // Get latest count for each door
        const summaries: DoorSummary[] = ['door-1', 'door-2', 'door-3'].map(
          (doorId) => {
            const doorCounters = result.data
              .filter((c: CounterData) => c.doorId === doorId)
              .sort(
                (a: CounterData, b: CounterData) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              );

            return {
              doorId,
              doorName: doorNames[doorId] || doorId,
              latestCount: doorCounters[0]?.count || 0,
              lastUpdated: doorCounters[0]?.timestamp || null,
            };
          }
        );

        setDoors(summaries);
      }
    } catch (error) {
      console.error('Error fetching counters:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReset = async (doorId?: string) => {
    if (
      !confirm(
        doorId
          ? `Are you sure you want to reset ${doorNames[doorId]}?`
          : 'Are you sure you want to reset ALL counters?'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doorId }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert('Failed to reset: ' + result.error);
      }
    } catch (error) {
      console.error('Error resetting:', error);
      alert('Failed to reset counters');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage all door counters</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Door Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {doors.map((door) => (
                <div
                  key={door.doorId}
                  className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200"
                >
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {door.doorName}
                  </h2>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {door.latestCount}
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {door.lastUpdated
                      ? `Last updated: ${new Date(
                          door.lastUpdated
                        ).toLocaleString()}`
                      : 'No data yet'}
                  </p>
                  <button
                    onClick={() => handleReset(door.doorId)}
                    disabled={isResetting}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Reset Counter
                  </button>
                </div>
              ))}
            </div>

            {/* Reset All Button */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Bulk Actions
              </h2>
              <button
                onClick={() => handleReset()}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Reset All Counters'}
              </button>
            </div>

            {/* All Counter Records */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                All Counter Records
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold text-gray-700">
                        Door
                      </th>
                      <th className="py-3 px-4 font-semibold text-gray-700">
                        Count
                      </th>
                      <th className="py-3 px-4 font-semibold text-gray-700">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCounters.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-gray-500"
                        >
                          No counter records found
                        </td>
                      </tr>
                    ) : (
                      allCounters
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                        )
                        .map((counter) => (
                          <tr
                            key={counter._id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              {doorNames[counter.doorId] || counter.doorId}
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              {counter.count}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(counter.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
