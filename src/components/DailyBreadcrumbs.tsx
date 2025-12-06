'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivityMarker, DailyRecord } from '@/types';
import { getActivities, getActivityMarkers, getDailyRecords, createDailyRecord, updateDailyRecord } from '@/lib/activityService';

interface DailyBreadcrumbsProps {
  userId: string;
  date: Date;
}

export default function DailyBreadcrumbs({ userId, date }: DailyBreadcrumbsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityMarkers, setActivityMarkers] = useState<Record<string, ActivityMarker[]>>({});
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Fetch daily records for the selected date
        const records = await getDailyRecords(userId, date);
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
  }, [userId, date]);

  const handleMarkerToggle = async (markerId: string) => {
    try {
      // Check if a record already exists for this marker on this date
      const existingRecord = dailyRecords.find(record => record.activityMarkerId === markerId);
      
      let updatedRecord: DailyRecord;
      
      if (existingRecord) {
        // Update existing record
        updatedRecord = await updateDailyRecord(existingRecord.id, !existingRecord.completed);
      } else {
        // Create new record
        updatedRecord = await createDailyRecord(userId, markerId, date, true);
      }
      
      // Update local state
      setDailyRecords(prev => {
        const existingIndex = prev.findIndex(r => r.activityMarkerId === markerId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = updatedRecord;
          return updated;
        } else {
          return [...prev, updatedRecord];
        }
      });
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  if (loading) {
    return <div className="text-black py-2">Loading...</div>;
  }

  return (
    <div className="p-1 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
      <h2 className="text-black mb-1 text-sm sm:text-base">
        🍞 {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </h2>
      
      {activities.length === 0 ? (
        <p className="text-black">No activities. Add activities to start!</p>
      ) : (
        <div className="space-y-1">
          {activities.map(activity => (
            <div key={activity.id} className="p-1 border-2 border-black mb-1" style={{ backgroundColor: '#8B4513' }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <h3 className="text-black font-bold text-sm sm:text-base">{activity.name} 🍞</h3>
                <a
                  href={`/activity?id=${activity.id}`}
                  className="text-black border-2 border-black px-2 py-1 text-sm sm:text-base"
                  style={{ backgroundColor: '#A0522D' }}
                >
                  Solo View
                </a>
              </div>

              {activityMarkers[activity.id] && activityMarkers[activity.id].length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {activityMarkers[activity.id].map(marker => {
                    const record = dailyRecords.find(r => r.activityMarkerId === marker.id);
                    const isCompleted = record ? record.completed : false;

                    return (
                      <label
                        key={marker.id}
                        className="p-1 border-2 border-black flex items-center cursor-pointer min-w-fit"
                        style={{ backgroundColor: isCompleted ? '#5D2E0A' : '#A0522D' }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleMarkerToggle(marker.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          readOnly
                          className="mr-1 cursor-pointer"
                          style={{ 
                            backgroundColor: isCompleted ? '#000' : '#A0522D',
                            pointerEvents: 'none'
                          }}
                        />
                        <span className="text-black text-sm">{marker.label}</span>
                      </label>
                    );
                  })}
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