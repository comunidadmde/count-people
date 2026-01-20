'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DoorCounterDisplayProps {
  doorId: string;
  doorName: string;
}

export default function DoorCounterDisplay({
  doorId,
  doorName,
}: DoorCounterDisplayProps) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch latest count on mount and every minute
  useEffect(() => {
    async function fetchLatestCount() {
      try {
        const response = await fetch(`/api/counters/${doorId}`);
        const result = await response.json();
        if (result.success && result.data) {
          setCount(result.data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching count:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Fetch immediately
    fetchLatestCount();
    
    // Set up interval to refresh data every minute
    const interval = setInterval(() => {
      fetchLatestCount();
    }, 60000); // 60000ms = 1 minute

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [doorId]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">{doorName}</h2>
      
      <div className="text-center mb-6">
        {isLoading ? (
          <div className="text-6xl font-bold text-gray-400 mb-2">...</div>
        ) : (
          <div className="text-6xl font-bold text-blue-600 mb-2">{count}</div>
        )}
        <p className="text-sm text-gray-500">Current Count</p>
      </div>

      <Link
        href={`/door/${doorId}`}
        className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg py-4 px-6 rounded-lg transition-colors text-center"
      >
        Go to Counter →
      </Link>
    </div>
  );
}
