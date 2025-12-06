'use client';

import { useState, useEffect, useMemo } from 'react';
import { Activity, ActivityMarker, DailyRecord } from '@/types';
import { getActivities, getActivityMarkers, getDailyRecordsForActivity } from '@/lib/activityService';

interface WeeklyBreadcrumbsProps {
  userId: string;
  startDate: Date; // The start of the week (Sunday)
}

export default function WeeklyBreadcrumbs({ userId, startDate }: WeeklyBreadcrumbsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityMarkers, setActivityMarkers] = useState<Record<string, ActivityMarker[]>>({});
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Memoize endDate to prevent infinite loop
  const endDate = useMemo(() => {
    const end = new Date(startDate);
    end.setDate(startDate.getDate() + 6);
    return end;
  }, [startDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all activities for the user
        const userActivities = await getActivities(userId);
        setActivities(userActivities);
        
        // Fetch markers for each activity
        const markersMap: Record<string, ActivityMarker[]> = {};
        for (const activity of userActivities) {
          const markers = await getActivityMarkers(activity.id);
          markersMap[activity.id] = markers;
        }
        setActivityMarkers(markersMap);
        
        // Fetch daily records for the week
        const records = await getDailyRecordsForActivity(userId, startDate, endDate);
        setDailyRecords(records);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, startDate, endDate]);

  // Generate the dates for the week
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    weekDates.push(date);
  }

  if (loading) {
    return <div className="text-black py-2">Loading...</div>;
  }

  return (
    <div className="p-1 sm:p-2 border-2 border-black overflow-x-auto" style={{ backgroundColor: '#A0522D' }}>
      <h2 className="text-black mb-1 text-sm sm:text-base">
        🍞 {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </h2>
      
      {activities.length === 0 ? (
        <p className="text-black text-sm">No activities. Add activities to start!</p>
      ) : (
        <div className="space-y-1">
          {activities.map(activity => (
            <div key={activity.id} className="p-1 border-2 border-black mb-1" style={{ backgroundColor: '#8B4513' }}>
              <h3 className="text-black font-bold mb-1 text-sm">{activity.name} 🍞</h3>
              
              {activityMarkers[activity.id] && activityMarkers[activity.id].length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-2 border-black text-xs sm:text-sm">
                    <thead>
                      <tr style={{ backgroundColor: '#5D2E0A' }}>
                        <th className="px-1 py-1 text-left text-black border border-black">Marker</th>
                        {weekDates.map((date, index) => (
                          <th key={index} className="px-1 py-1 text-center text-black border border-black w-8 sm:w-12">
                            {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}<br />
                            <span className="text-xs">{date.getDate()}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activityMarkers[activity.id].map(marker => (
                        <tr key={marker.id}>
                          <td className="px-1 py-1 text-black border border-black whitespace-nowrap text-xs" style={{ backgroundColor: '#A0522D' }}>{marker.label}</td>
                          {weekDates.map((date, index) => {
                            const record = dailyRecords.find(
                              r => 
                                r.activityMarkerId === marker.id && 
                                r.date.toDateString() === date.toDateString()
                            );
                            
                            return (
                              <td key={index} className="px-1 py-1 text-center border border-black" style={{ backgroundColor: '#A0522D' }}>
                                {record ? (
                                  <div 
                                    className="w-4 h-4 mx-auto flex items-center justify-center border-2 border-black text-xs"
                                    style={{ backgroundColor: record.completed ? '#000' : '#8B4513', color: '#A0522D' }}
                                  >
                                    {record.completed ? '✓' : ''}
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 mx-auto border-2 border-black" style={{ backgroundColor: '#8B4513' }}></div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-black text-sm">No markers. Add markers to track.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}