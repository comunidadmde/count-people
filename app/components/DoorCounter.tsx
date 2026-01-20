'use client';

import { useState, useEffect } from 'react';

interface DoorCounterProps {
  doorId: string;
  doorName: string;
  initialCount?: number;
}

export default function DoorCounter({
  doorId,
  doorName,
  initialCount = 0,
}: DoorCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState(false);

  // Load user name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('counter-user-name');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowNameInput(true);
    }
  }, []);

  // Fetch latest count on mount
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
      }
    }
    fetchLatestCount();
  }, [doorId]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameInput = (e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (name) {
      setUserName(name);
      localStorage.setItem('counter-user-name', name);
      setShowNameInput(false);
    }
  };

  const handleNameChange = () => {
    setShowNameInput(true);
  };

  const incrementAndSave = async () => {
    // Check if name is set
    if (!userName || userName.trim() === '') {
      setShowNameInput(true);
      alert('Please enter your name first');
      return;
    }

    const newCount = count + 1;
    setCount(newCount);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/counters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doorId,
          count: newCount,
          userName: userName.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setLastSaved(new Date());
      } else {
        // Revert on error
        setCount(count);
        alert('Failed to save counter: ' + result.error);
      }
    } catch (error) {
      // Revert on error
      setCount(count);
      console.error('Error saving counter:', error);
      alert('Failed to save counter');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{doorName}</h2>
      
      {/* Name Input Section */}
      {showNameInput ? (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <form onSubmit={handleNameSubmit} className="space-y-3">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Enter your name:
            </label>
            <div className="flex gap-2">
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={userName}
                placeholder="Your name"
                required
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-400 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-600">
            Counting as: <span className="font-semibold text-blue-600">{userName}</span>
            <button
              onClick={handleNameChange}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
            >
              Change
            </button>
          </p>
        </div>
      )}
      
      <div className="text-center mb-10">
        <div className="text-8xl font-bold text-blue-600 mb-3">{count}</div>
        <p className="text-lg text-gray-500">Current Count</p>
      </div>

      <button
        onClick={incrementAndSave}
        disabled={isLoading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold text-3xl py-12 px-6 rounded-xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 duration-200"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : (
          '+ Count Person'
        )}
      </button>

      {lastSaved && (
        <p className="text-sm text-gray-500 mt-6 text-center">
          ✓ Last saved: {lastSaved.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
