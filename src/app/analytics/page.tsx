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
      totalDays: number; // Total days with activity (that have targets)
      allActiveDays: number; // All days with any activity
      markers: { 
        id: string; 
        label: string; 
        target?: number; 
        completions: number; 
        targetMet: number;
        dailyPercentages: { date: string; percentage: number; completions: number; target?: number }[];
      }[]
    }> = {};
    
    activities.forEach(activity => {
      const activityRecords = dailyRecords.filter(
        record => activityMarkers[activity.id]?.some(marker => marker.id === record.activityMarkerId)
      );
      
      // Calculate per-marker stats including target progress
      const markerStats = (activityMarkers[activity.id] || []).map(marker => {
        const markerRecords = activityRecords.filter(r => r.activityMarkerId === marker.id && r.completed);
        
        // Group by date to count completions and get target for that day
        // Use the target stored on the record (historical) if available, otherwise use current marker target
        const completionsByDate: Record<string, { count: number; target?: number }> = {};
        markerRecords.forEach(r => {
          const dateKey = r.dateString;
          if (!completionsByDate[dateKey]) {
            // Use record's target (preserved from when it was created) or fall back to current marker target
            completionsByDate[dateKey] = { 
              count: 0, 
              target: r.target !== undefined ? r.target : marker.target 
            };
          }
          completionsByDate[dateKey].count++;
        });
        
        // Count days where target was met and calculate daily percentages
        let targetMetDays = 0;
        const dailyPercentages: { date: string; percentage: number; completions: number; target?: number }[] = [];
        
        Object.entries(completionsByDate).forEach(([date, data]) => {
          const dayTarget = data.target;
          if (dayTarget) {
            const pct = Math.round((data.count / dayTarget) * 100);
            dailyPercentages.push({ date, percentage: pct, completions: data.count, target: dayTarget });
            if (data.count >= dayTarget) {
              targetMetDays++;
            }
          }
        });
        
        return {
          id: marker.id,
          label: marker.label,
          target: marker.target, // Current target for display
          completions: markerRecords.length,
          targetMet: targetMetDays,
          dailyPercentages
        };
      });
      
      // Overall target met days - a day counts as "met" if ALL markers with targets hit their targets
      const allDates = new Set<string>();
      const dayTargetStatus: Record<string, { met: number; total: number }> = {};
      
      (activityMarkers[activity.id] || []).forEach(marker => {
        const markerRecords = activityRecords.filter(r => r.activityMarkerId === marker.id && r.completed);
        
        // Group by date with stored target info
        const completionsByDate: Record<string, { count: number; target?: number }> = {};
        markerRecords.forEach(r => {
          if (!completionsByDate[r.dateString]) {
            // Use record's target (preserved from when it was created) or fall back to current marker target
            completionsByDate[r.dateString] = { 
              count: 0, 
              target: r.target !== undefined ? r.target : marker.target 
            };
          }
          completionsByDate[r.dateString].count++;
          allDates.add(r.dateString);
        });
        
        // For each date this marker was used, track if target was met
        Object.entries(completionsByDate).forEach(([date, data]) => {
          if (data.target) { // Only count if there's a target
            if (!dayTargetStatus[date]) {
              dayTargetStatus[date] = { met: 0, total: 0 };
            }
            dayTargetStatus[date].total++;
            if (data.count >= data.target) {
              dayTargetStatus[date].met++;
            }
          }
        });
      });
      
      // Count days where ALL markers with targets were met
      const daysTargetMet = Object.values(dayTargetStatus).filter(s => s.met === s.total && s.total > 0).length;
      
      // Calculate overall percentage based on targets
      let totalTargetSum = 0;
      let totalCompletions = 0;
      markerStats.forEach(m => {
        if (m.target) {
          totalCompletions += m.completions;
          // Target sum = target * number of days marker was used
          totalTargetSum += m.target * m.dailyPercentages.length;
        }
      });
      
      const percentage = totalTargetSum > 0 ? Math.round((totalCompletions / totalTargetSum) * 100) : 0;
      
      // Count ALL active days for this activity (not just with targets)
      const allActiveDays = new Set(activityRecords.map(r => r.dateString)).size;
      
      stats[activity.id] = {
        total: activityMarkers[activity.id]?.length || 0,
        completed: activityRecords.filter(r => r.completed).length,
        percentage,
        targetMet: daysTargetMet,
        totalDays: allDates.size,
        allActiveDays,
        markers: markerStats
      };
    });
    
    return stats;
  };

  const stats = calculateStats();

  // Get unique dates for the current view - using dateString for consistency
  const uniqueDates = new Set(dailyRecords.map(record => record.dateString)).size;
  
  // Get unique dates with target activity only
  const datesWithTargets = new Set<string>();
  Object.values(stats).forEach(s => {
    s.markers.forEach(m => {
      if (m.target) {
        m.dailyPercentages.forEach(d => datesWithTargets.add(d.date));
      }
    });
  });
  const uniqueDatesWithTargets = datesWithTargets.size;

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
                <p className="text-2xl text-black font-bold">
                  {uniqueDatesWithTargets > 0 ? uniqueDatesWithTargets : uniqueDates}
                </p>
                <p className="text-sm text-black">
                  {uniqueDatesWithTargets > 0 && uniqueDatesWithTargets !== uniqueDates 
                    ? `${uniqueDatesWithTargets} with targets (${uniqueDates} total)`
                    : 'Days with activity'}
                </p>
                </div>
                
              <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
                <h3 className="text-black mb-1">Activities</h3>
                <p className="text-2xl text-black font-bold">{activities.length}</p>
                <p className="text-sm text-black">Activity types</p>
                </div>
                
              <div className="p-2 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
                <h3 className="text-black mb-1">Target Completion</h3>
                <p className="text-2xl text-black font-bold">
                    {(() => {
                      // Calculate overall target percentage across all activities
                      let totalTargetSum = 0;
                      let totalCompletions = 0;
                      Object.values(stats).forEach(s => {
                        s.markers.forEach(m => {
                          if (m.target) {
                            totalCompletions += m.completions;
                            totalTargetSum += m.target * m.dailyPercentages.length;
                          }
                        });
                      });
                      return totalTargetSum > 0 ? Math.round((totalCompletions / totalTargetSum) * 100) : 0;
                    })()}%
                  </p>
                <p className="text-sm text-black">Of daily targets</p>
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
                            {activityStats.markers.map(marker => {
                              // Calculate average daily percentage for this marker
                              const avgPct = marker.dailyPercentages.length > 0
                                ? Math.round(marker.dailyPercentages.reduce((sum, d) => sum + d.percentage, 0) / marker.dailyPercentages.length)
                                : 0;
                              
                              return (
                                <div key={marker.id} className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="text-black">{marker.label}:</span>
                                  <span className="text-black">{marker.completions}x</span>
                                  {marker.target && (
                                    <>
                                      <span 
                                        className="px-1 border border-black text-xs"
                                        style={{ backgroundColor: marker.targetMet > 0 ? '#228B22' : '#5D2E0A' }}
                                      >
                                        🎯 {marker.targetMet} days hit target ({marker.target}/day)
                                      </span>
                                      {avgPct > 0 && (
                                        <span 
                                          className="px-1 border border-black text-xs"
                                          style={{ backgroundColor: avgPct >= 100 ? '#228B22' : '#A0522D' }}
                                        >
                                          avg: {avgPct}%
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Show daily breakdown for markers with targets */}
                        {hasTargets && activityStats.totalDays > 0 && (
                          <div className="mt-1 pt-1 border-t border-black">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-black text-sm">Days at 100%+:</span>
                              <span 
                                className="px-1 border border-black text-sm font-bold"
                                style={{ backgroundColor: activityStats.targetMet > 0 ? '#228B22' : '#8B0000' }}
                              >
                                {activityStats.targetMet}/{activityStats.totalDays}
                              </span>
                              <span className="text-black text-xs">
                                ({Math.round((activityStats.targetMet / activityStats.totalDays) * 100)}% of active days)
                              </span>
                            </div>
                            
                            {/* Daily breakdown showing percentages including over 100% */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activityStats.markers
                                .filter(m => m.target && m.dailyPercentages.length > 0)
                                .flatMap(m => m.dailyPercentages.map(d => ({ ...d, marker: m.label, target: m.target })))
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .slice(0, 7)
                                .map((day, i) => (
                                  <div 
                                    key={i}
                                    className="px-1 border border-black text-xs"
                                    style={{ backgroundColor: day.percentage >= 100 ? '#228B22' : '#A0522D' }}
                                  >
                                    {day.date.slice(5)}: {day.percentage}%
                                  </div>
                                ))}
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