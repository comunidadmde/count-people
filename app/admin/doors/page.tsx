'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface DoorInfo {
  _id?: string;
  doorId: string;
  doorName: string;
  auditorium: string;
  password?: string; // Password is not returned from API for security
}

export default function DoorsManagementPage() {
  const router = useRouter();
  const t = useTranslations();
  const [doors, setDoors] = useState<DoorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDoor, setEditingDoor] = useState<DoorInfo | null>(null);
  const [formData, setFormData] = useState({ doorName: '', auditorium: '', password: '' });

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
      if (!formData.doorName.trim()) {
        alert(t('admin.doors.doorName') + ' ' + t('common.required'));
        return;
      }

      if (!formData.auditorium.trim()) {
        alert(t('admin.doors.auditoriumRequired'));
        return;
      }

      // Password is required for new doors, optional for editing (to keep current)
      if (!editingDoor && !formData.password.trim()) {
        alert(t('admin.doors.passwordRequired'));
        return;
      }

      // If editing and password is empty, don't send it (will keep current password)
      const requestBody: any = {
        doorName: formData.doorName.trim(),
        auditorium: formData.auditorium.trim(),
      };

      // Include _id if editing
      if (editingDoor?._id) {
        requestBody._id = editingDoor._id;
      }

      // Only include password if it's provided (for new doors or when updating)
      if (formData.password.trim()) {
        requestBody.password = formData.password.trim();
      } else if (!editingDoor) {
        // New door must have password
        alert(t('admin.doors.passwordRequired'));
        return;
      }

      const response = await fetch('/api/doors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      if (result.success) {
        alert(t('admin.doors.doorSaved'));
        setFormData({ doorName: '', auditorium: '', password: '' });
        setEditingDoor(null);
        fetchDoors();
      } else {
        alert(t('admin.doors.doorSaveFailed') + ': ' + result.error);
      }
    } catch (error) {
      console.error('Error saving door:', error);
      alert(t('admin.doors.doorSaveFailed'));
    }
  };

  const handleEdit = (door: DoorInfo) => {
    setEditingDoor(door);
    setFormData({
      doorName: door.doorName,
      auditorium: door.auditorium,
      password: '', // Don't pre-fill password for security
    });
  };

  const handleCancel = () => {
    setEditingDoor(null);
    setFormData({ doorName: '', auditorium: '', password: '' });
  };

  const handleDelete = async (door: DoorInfo) => {
    if (!door._id) {
      alert(t('admin.doors.doorDeleteFailed') + ': ' + 'Invalid door ID');
      return;
    }

    const confirmMessage = t('admin.doors.deleteDoorConfirm', { doorName: door.doorName });
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/doors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: door._id }),
      });

      const result = await response.json();
      if (result.success) {
        alert(t('admin.doors.doorDeleted'));
        fetchDoors();
      } else {
        alert(t('admin.doors.doorDeleteFailed') + ': ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting door:', error);
      alert(t('admin.doors.doorDeleteFailed'));
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">{t('common.loading')}</p>
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
              {t('admin.doors.title')}
            </h1>
            <p className="text-gray-600">{t('admin.doors.subtitle')}</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {t('admin.doors.backToDashboard')}
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingDoor ? t('admin.doors.editDoor') : t('admin.doors.addUpdateDoor')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="doorName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.doors.doorName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="doorName"
                type="text"
                value={formData.doorName}
                onChange={(e) => setFormData({ ...formData, doorName: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('admin.doors.doorNamePlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editingDoor ? t('admin.doors.doorIdHelp') : t('admin.doors.doorIdHelp')}
              </p>
            </div>
            <div>
              <label htmlFor="auditorium" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.doors.auditorium')}
              </label>
              <input
                id="auditorium"
                type="text"
                value={formData.auditorium}
                onChange={(e) => setFormData({ ...formData, auditorium: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('admin.doors.auditoriumPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.doors.auditoriumHelp')}
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.doors.passwordLabel')} {editingDoor && <span className="text-gray-500">({t('admin.doors.passwordKeepCurrent')})</span>}
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingDoor}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('admin.doors.passwordPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.doors.passwordHelp')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                {editingDoor ? t('common.update') : t('common.save')}
              </button>
              {editingDoor && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Doors List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('admin.doors.existingDoors')}</h2>
          {doors.length === 0 ? (
            <p className="text-gray-600">{t('admin.doors.noDoors')}</p>
          ) : (
            <div className="space-y-4">
              {doors.map((door) => (
                <div
                  key={door._id || door.doorId}
                  className="border-2 border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{door.doorName}</h3>
                      <p className="text-sm text-gray-600">ID: {door.doorId}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(door)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(door)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-1">{t('admin.dashboard.auditorium')}:</p>
                    {door.auditorium ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium inline-block">
                        {door.auditorium}
                      </span>
                    ) : (
                      <p className="text-sm text-gray-500">{t('admin.doors.noAuditorium')}</p>
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
