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
    const stats: Record<string, { 
      total: number; 
      completed: number; 
      percentage: number;
      targetMet: number; // Days where target was met
      totalDays: number; // Total days with activity
      markers: { id: string; label: string; target?: number; completions: number; targetMet: number }[]
    }> = {};
    
    activities.forEach(activity => {
      const activityRecords = dailyRecords.filter(
        record => activityMarkers[activity.id]?.some(marker => marker.id === record.activityMarkerId)
      );
      
      const totalMarkers = activityMarkers[activity.id]?.length || 0;
      const completedRecords = activityRecords.filter(record => record.completed).length;
      const percentage = totalMarkers > 0 ? Math.round((completedRecords / totalMarkers) * 100) : 0;
      
      // Calculate per-marker stats including target progress
      const markerStats = (activityMarkers[activity.id] || []).map(marker => {
        const markerRecords = activityRecords.filter(r => r.activityMarkerId === marker.id && r.completed);
        
        // Group by date to count completions per day
        const completionsByDate: Record<string, number> = {};
        markerRecords.forEach(r => {
          const dateKey = r.dateString;
          completionsByDate[dateKey] = (completionsByDate[dateKey] || 0) + 1;
        });
        
        // Count days where target was met
        let targetMetDays = 0;
        if (marker.target) {
          targetMetDays = Object.values(completionsByDate).filter(count => count >= marker.target!).length;
        }
        
        return {
          id: marker.id,
          label: marker.label,
          target: marker.target,
          completions: markerRecords.length,
          targetMet: targetMetDays
        };
      });
      
      // Overall target met days (any marker that has a target and was met)
      const daysWithTarget = new Set<string>();
      const daysTargetMet = new Set<string>();
      
      (activityMarkers[activity.id] || []).forEach(marker => {
        if (marker.target) {
          const markerRecords = activityRecords.filter(r => r.activityMarkerId === marker.id && r.completed);
          const completionsByDate: Record<string, number> = {};
          markerRecords.forEach(r => {
            completionsByDate[r.dateString] = (completionsByDate[r.dateString] || 0) + 1;
            daysWithTarget.add(r.dateString);
          });
          Object.entries(completionsByDate).forEach(([date, count]) => {
            if (count >= marker.target!) {
              daysTargetMet.add(date);
            }
          });
        }
      });
      
      stats[activity.id] = {
        total: totalMarkers,
        completed: completedRecords,
        percentage,
        targetMet: daysTargetMet.size,
        totalDays: daysWithTarget.size,
        markers: markerStats
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
                <div className="space-y-2">
                  {activities.map(activity => {
                    const activityStats = stats[activity.id];
                    const hasTargets = activityStats?.markers.some(m => m.target);
                    
                    return (
                      <div key={activity.id} className="border-2 border-black p-2" style={{ backgroundColor: '#8B4513' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-black font-bold">{activity.name}</span>
                          <span className="text-black text-sm">{activityStats?.completed || 0} completions</span>
                        </div>
                        
                        {/* Show marker-level stats with targets */}
                        {activityStats?.markers.length > 0 && (
                          <div className="space-y-1">
                            {activityStats.markers.map(marker => (
                              <div key={marker.id} className="flex items-center gap-2 text-sm">
                                <span className="text-black">{marker.label}:</span>
                                <span className="text-black">{marker.completions}x</span>
                                {marker.target && (
                                  <span 
                                    className="px-1 border border-black text-xs"
                                    style={{ backgroundColor: marker.targetMet > 0 ? '#228B22' : '#5D2E0A' }}
                                  >
                                    🎯 {marker.targetMet} days hit target ({marker.target}/day)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Target summary if there are targets */}
                        {hasTargets && activityStats.totalDays > 0 && (
                          <div className="mt-1 pt-1 border-t border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-black text-sm">Target Success Rate:</span>
                              <span 
                                className="px-1 border border-black text-sm font-bold"
                                style={{ backgroundColor: activityStats.targetMet > 0 ? '#228B22' : '#8B0000' }}
                              >
                                {Math.round((activityStats.targetMet / activityStats.totalDays) * 100)}%
                              </span>
                              <span className="text-black text-xs">
                                ({activityStats.targetMet}/{activityStats.totalDays} days)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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