'use client';

import { useUser } from '@/context/userContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import WeeklyBreadcrumbs from '@/components/WeeklyBreadcrumbs';
import { Activity } from '@/types';

export default function WeeklyView() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getStartOfWeek(new Date()));

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  if (!user) {
    return null; // Render nothing if not authenticated
  }

  // Function to get the start of the current week (Sunday)
  function getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const diff = start.getDate() - day; // Adjust to get Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  // Function to get the start of the previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeekStart(newDate);
  };

  // Function to get the start of the next week
  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeekStart(newDate);
  };

  // Function to go to current week
  const goToCurrentWeek = () => {
    setSelectedWeekStart(getStartOfWeek(new Date()));
  };

  if (!user) {
    return null; // Render nothing if not authenticated
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#8B4513' }}>
      <nav style={{ backgroundColor: '#5D2E0A' }} className="border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 py-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl">🍞</span>
              <h1 className="text-sm sm:text-lg hidden sm:block">Breadcrumb Tracker</h1>
              <div className="flex gap-1">
                <a href="/dashboard" className="px-2 py-1 text-black border border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Daily</a>
                <a href="/weekly" className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Weekly</a>
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
        <div className="mb-1 sm:mb-2 flex flex-wrap items-center justify-between gap-1">
          <h2 className="text-sm sm:text-xl text-black">Weekly 🍞</h2>
            
          <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousWeek}
              className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm"
              style={{ backgroundColor: '#5D2E0A' }}
              >
              &larr; Prev
              </button>
              
              <button
                onClick={goToCurrentWeek}
              className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm"
              style={{ backgroundColor: '#A0522D' }}
              >
              Now
              </button>
              
              <button
                onClick={goToNextWeek}
              className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm"
              style={{ backgroundColor: '#5D2E0A' }}
              >
              Next &rarr;
              </button>
            </div>
          </div>

          <WeeklyBreadcrumbs userId={user.id} startDate={selectedWeekStart} />
      </main>
    </div>
  );
}