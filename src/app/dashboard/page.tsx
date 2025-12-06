'use client';

import { useUser } from '@/context/userContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ActivityForm from '@/components/ActivityForm';
import DailyBreadcrumbs from '@/components/DailyBreadcrumbs';
import { Activity } from '@/types';

export default function Dashboard() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Render nothing if not authenticated
  }

  const handleActivityAdded = (activity: Activity) => {
    setActivities(prev => [...prev, activity]);
  };

  if (!user) {
    return null; // Render nothing if not authenticated
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#8B4513' }}>
      <nav style={{ backgroundColor: '#5D2E0A' }} className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-2 py-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">🍞</span>
              <h1 className="text-sm sm:text-lg hidden sm:block">Breadcrumb Tracker</h1>
              <div className="flex gap-1">
                <a href="/dashboard" className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Daily</a>
                <a href="/weekly" className="px-2 py-1 text-black border border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Weekly</a>
                <a href="/analytics" className="px-2 py-1 text-black border border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Analytics</a>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-black text-xs sm:text-sm">{user.username}</span>
              <button
                onClick={logout}
                className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm"
                style={{ backgroundColor: '#A0522D' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="px-1 sm:px-2 py-1 sm:py-2">
        <div className="mb-1 sm:mb-2">
          <ActivityForm
            userId={user.id}
            onActivityAdded={handleActivityAdded}
          />
        </div>

        <div className="mb-1 sm:mb-2">
          <label htmlFor="date-picker" className="block text-black mb-0.5 text-sm">Date:</label>
          <input
            type="date"
            id="date-picker"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-2 py-1 text-black border-2 border-black text-sm"
            style={{ backgroundColor: '#A0522D' }}
          />
        </div>

        <DailyBreadcrumbs userId={user.id} date={selectedDate} />
      </main>
    </div>
  );
}