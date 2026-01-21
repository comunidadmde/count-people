'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DoorInfo {
  doorId: string;
  doorName: string;
  auditorium: string;
}

export default function DoorsManagementPage() {
  const router = useRouter();
  const [doors, setDoors] = useState<DoorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDoor, setEditingDoor] = useState<DoorInfo | null>(null);
  const [formData, setFormData] = useState({ doorId: '', doorName: '', auditorium: '' });

  useEffect(() => {
    fetchDoors();
  }, []);

  const fetchDoors = async () => {
    try {
      const response = await fetch('/api/doors');
      const result = await response.json();
      if (result.success) {
        setDoors(result.data);
      }
    } catch (error) {
      console.error('Error fetching doors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.auditorium.trim()) {
        alert('Auditorium is required');
        return;
      }

      const response = await fetch('/api/doors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doorId: formData.doorId,
          doorName: formData.doorName,
          auditorium: formData.auditorium.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Door saved successfully!');
        setFormData({ doorId: '', doorName: '', auditorium: '' });
        setEditingDoor(null);
        fetchDoors();
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving door:', error);
      alert('Failed to save door');
    }
  };

  const handleEdit = (door: DoorInfo) => {
    setEditingDoor(door);
    setFormData({
      doorId: door.doorId,
      doorName: door.doorName,
      auditorium: door.auditorium,
    });
  };

  const handleCancel = () => {
    setEditingDoor(null);
    setFormData({ doorId: '', doorName: '', auditorium: '' });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Manage Doors & Auditoriums
            </h1>
            <p className="text-gray-600">Configure doors and their auditoriums</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingDoor ? 'Edit Door' : 'Add/Update Door'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="doorId" className="block text-sm font-medium text-gray-700 mb-1">
                Door ID (e.g., door-1, door-2)
              </label>
              <input
                id="doorId"
                type="text"
                value={formData.doorId}
                onChange={(e) => setFormData({ ...formData, doorId: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="door-1"
              />
            </div>
            <div>
              <label htmlFor="doorName" className="block text-sm font-medium text-gray-700 mb-1">
                Door Name
              </label>
              <input
                id="doorName"
                type="text"
                value={formData.doorName}
                onChange={(e) => setFormData({ ...formData, doorName: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Main Entrance"
              />
            </div>
            <div>
              <label htmlFor="auditorium" className="block text-sm font-medium text-gray-700 mb-1">
                Auditorium
              </label>
              <input
                id="auditorium"
                type="text"
                value={formData.auditorium}
                onChange={(e) => setFormData({ ...formData, auditorium: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Auditorium A"
              />
              <p className="text-xs text-gray-500 mt-1">
                Each door belongs to one auditorium
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                {editingDoor ? 'Update' : 'Save'}
              </button>
              {editingDoor && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Doors List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Existing Doors</h2>
          {doors.length === 0 ? (
            <p className="text-gray-600">No doors configured yet. Add one above.</p>
          ) : (
            <div className="space-y-4">
              {doors.map((door) => (
                <div
                  key={door.doorId}
                  className="border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{door.doorName}</h3>
                      <p className="text-sm text-gray-600">ID: {door.doorId}</p>
                    </div>
                    <button
                      onClick={() => handleEdit(door)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Auditorium:</p>
                    {door.auditorium ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium inline-block">
                        {door.auditorium}
                      </span>
                    ) : (
                      <p className="text-sm text-gray-500">No auditorium configured</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
