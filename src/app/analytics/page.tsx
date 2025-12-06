'use client';

import { useUser } from '@/context/userContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, ActivityMarker, DailyRecord } from '@/types';
import { getActivities, getActivityMarkers, getDailyRecordsForActivity } from '@/lib/activityService';

export default function Analytics() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityMarkers, setActivityMarkers] = useState<Record<string, ActivityMarker[]>>({});
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'monthly' | 'yearly' | 'alltime'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all activities for the user
        const userActivities = await getActivities(user.id);
        setActivities(userActivities);
        
        // Fetch markers for each activity
        const markersMap: Record<string, ActivityMarker[]> = {};
        for (const activity of userActivities) {
          const markers = await getActivityMarkers(activity.id);
          markersMap[activity.id] = markers;
        }
        setActivityMarkers(markersMap);
        
        // Fetch records based on the current view type
        let records: DailyRecord[] = [];
        
        if (viewType === 'monthly') {
          const [year, month] = selectedMonth.split('-').map(Number);
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0); // Last day of the month
          records = await getDailyRecordsForActivity(user.id, startDate, endDate);
        } else if (viewType === 'yearly') {
          const year = parseInt(selectedYear);
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          records = await getDailyRecordsForActivity(user.id, startDate, endDate);
        } else { // alltime
          const startDate = new Date(2020, 0, 1); // Start from 2020 or whenever app started
          const endDate = new Date();
          records = await getDailyRecordsForActivity(user.id, startDate, endDate);
        }
        
        setDailyRecords(records);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, viewType, selectedMonth, selectedYear, router]);

  // Calculate statistics based on the current view type
  const calculateStats = () => {
    const stats: Record<string, { total: number; completed: number; percentage: number }> = {};
    
    activities.forEach(activity => {
      const activityRecords = dailyRecords.filter(
        record => activityMarkers[activity.id]?.some(marker => marker.id === record.activityMarkerId)
      );
      
      const totalMarkers = activityMarkers[activity.id]?.length || 0;
      const completedRecords = activityRecords.filter(record => record.completed).length;
      const percentage = totalMarkers > 0 ? Math.round((completedRecords / totalMarkers) * 100) : 0;
      
      stats[activity.id] = {
        total: totalMarkers,
        completed: completedRecords,
        percentage
      };
    });
    
    return stats;
  };

  const stats = calculateStats();

  // Get unique dates for the current view
  const uniqueDates = Array.from(new Set(dailyRecords.map(record => record.date.toDateString()))).length;

  if (!user) {
    return null;
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
                <a href="/weekly" className="px-2 py-1 text-black border border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Weekly</a>
                <a href="/analytics" className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm" style={{ backgroundColor: '#A0522D' }}>Analytics</a>
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
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-2">
          <h2 className="text-sm sm:text-xl text-black">Analytics 🍞</h2>
          
          <div className="flex flex-wrap gap-1">
            <div className="flex items-center">
              <label htmlFor="view-type" className="mr-1 text-black text-xs sm:text-sm">View:</label>
              <select
                id="view-type"
                value={viewType}
                onChange={(e) => setViewType(e.target.value as 'monthly' | 'yearly' | 'alltime')}
                className="px-2 py-1 text-black border-2 border-black text-xs sm:text-sm"
                style={{ backgroundColor: '#A0522D' }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="alltime">All Time</option>
              </select>
            </div>

            {viewType === 'monthly' && (
              <div className="flex items-center">
                <label htmlFor="month-select" className="mr-1 text-black">Month:</label>
                <input
                  type="month"
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 text-black border-2 border-black"
                  style={{ backgroundColor: '#A0522D' }}
                />
              </div>
            )}

            {viewType === 'yearly' && (
              <div className="flex items-center">
                <label htmlFor="year-select" className="mr-1 text-black">Year:</label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2 py-1 text-black border-2 border-black"
                  style={{ backgroundColor: '#A0522D' }}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-black py-2">Loading...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
                <h3 className="text-black mb-1">Active Days</h3>
                <p className="text-2xl text-black font-bold">{uniqueDates}</p>
                <p className="text-sm text-black">Days with activity</p>
              </div>
              
              <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
                <h3 className="text-black mb-1">Activities</h3>
                <p className="text-2xl text-black font-bold">{activities.length}</p>
                <p className="text-sm text-black">Activity types</p>
              </div>
              
              <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
                <h3 className="text-black mb-1">Completion</h3>
                <p className="text-2xl text-black font-bold">
                  {dailyRecords.length > 0 
                    ? Math.round((dailyRecords.filter(r => r.completed).length / dailyRecords.length) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-black">Of all markers</p>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="p-2 border-2 border-black mb-2" style={{ backgroundColor: '#A0522D' }}>
              <h3 className="text-black mb-2">Activity Overview 🍞</h3>
              
              {activities.length === 0 ? (
                <p className="text-black">No activities. Create activities to see analytics.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-2 border-black">
                    <thead>
                      <tr style={{ backgroundColor: '#5D2E0A' }}>
                        <th className="px-2 py-1 text-left text-black border border-black">Activity</th>
                        <th className="px-2 py-1 text-left text-black border border-black">Markers</th>
                        <th className="px-2 py-1 text-left text-black border border-black">Completed</th>
                        <th className="px-2 py-1 text-left text-black border border-black">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(activity => (
                        <tr key={activity.id}>
                          <td className="px-2 py-1 text-black border border-black" style={{ backgroundColor: '#8B4513' }}>{activity.name}</td>
                          <td className="px-2 py-1 text-black border border-black" style={{ backgroundColor: '#8B4513' }}>{stats[activity.id]?.total || 0}</td>
                          <td className="px-2 py-1 text-black border border-black" style={{ backgroundColor: '#8B4513' }}>{stats[activity.id]?.completed || 0}</td>
                          <td className="px-2 py-1 text-black border border-black" style={{ backgroundColor: '#8B4513' }}>
                            <div className="text-black">
                              {stats[activity.id]?.percentage || 0}%
                            </div>
                            <div className="mt-1 w-full border-2 border-black h-2" style={{ backgroundColor: '#A0522D' }}>
                              <div 
                                className="h-2 border-r-2 border-black" 
                                style={{ width: `${stats[activity.id]?.percentage || 0}%`, backgroundColor: '#000' }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Chart Placeholder */}
            <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
              <h3 className="text-black mb-2">Trends 🍞</h3>
              <div className="h-32 flex items-center justify-center border-2 border-black" style={{ backgroundColor: '#8B4513' }}>
                <p className="text-black">Trend visualization coming soon</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}