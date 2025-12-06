'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Activity, ActivityMarker, ActivitySchedule, ScheduleType } from '@/types';
import { createActivity, createActivityMarker, getActivityMarkers } from '@/lib/activityService';

interface ActivityFormProps {
  userId: string;
  onActivityAdded: (activity: Activity) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ActivityForm({ userId, onActivityAdded }: ActivityFormProps) {
  const [activityName, setActivityName] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [markerLabel, setMarkerLabel] = useState('');
  const [markers, setMarkers] = useState<ActivityMarker[]>([]);
  
  // Scheduling state
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // All days by default
  const [customDays, setCustomDays] = useState<number>(7);

  const handleAddActivity = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!activityName.trim()) return;
    
    // Build schedule object
    const schedule: ActivitySchedule = { type: scheduleType };
    if (scheduleType === 'weekly') {
      schedule.daysOfWeek = selectedDays;
    } else if (scheduleType === 'custom') {
      schedule.customDays = customDays;
    }
    
    try {
      const newActivity = await createActivity(userId, activityName.trim(), schedule);
      onActivityAdded(newActivity);
      setActivityName('');
      setActivityId(newActivity.id);
      setIsAddingActivity(true);
      setMarkers([]); // Reset markers when a new activity is created
      // Reset schedule options
      setScheduleType('daily');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomDays(7);
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };
  
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleAddMarker = async () => {
    if (!markerLabel.trim() || !activityId) return;
    
    try {
      const newMarker = await createActivityMarker(activityId, markerLabel.trim());
      setMarkers([...markers, newMarker]);
      setMarkerLabel('');
    } catch (error) {
      console.error('Error creating marker:', error);
    }
  };

  // When we start adding markers for a new activity, fetch its existing markers
  useEffect(() => {
    const fetchMarkers = async () => {
      if (activityId) {
        try {
          const fetchedMarkers = await getActivityMarkers(activityId);
          setMarkers(fetchedMarkers);
        } catch (error) {
          console.error('Error fetching markers:', error);
        }
      }
    };
    
    if (isAddingActivity) {
      fetchMarkers();
    }
  }, [activityId, isAddingActivity]);

  return (
    <div className="p-1 sm:p-2 border-2 border-black mb-1 sm:mb-2" style={{ backgroundColor: '#A0522D' }}>
      <h2 className="text-black mb-1 text-sm sm:text-base">🍞 Add Activity</h2>
      
      <form onSubmit={handleAddActivity} className="mb-1">
        <div className="flex gap-1 sm:gap-2 mb-1">
          <input
            type="text"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            placeholder="Activity name"
            className="flex-1 px-2 py-1 text-black border-2 border-black text-sm"
            style={{ backgroundColor: '#8B4513', color: '#000' }}
          />
        </div>
        
        {/* Schedule Options */}
        <div className="mb-1">
          <label className="text-black text-xs block mb-0.5">Schedule:</label>
          <div className="flex gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setScheduleType('daily')}
              className={`px-2 py-0.5 text-black border-2 border-black text-xs ${scheduleType === 'daily' ? 'font-bold' : ''}`}
              style={{ backgroundColor: scheduleType === 'daily' ? '#5D2E0A' : '#8B4513' }}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('weekly')}
              className={`px-2 py-0.5 text-black border-2 border-black text-xs ${scheduleType === 'weekly' ? 'font-bold' : ''}`}
              style={{ backgroundColor: scheduleType === 'weekly' ? '#5D2E0A' : '#8B4513' }}
            >
              Select Days
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('custom')}
              className={`px-2 py-0.5 text-black border-2 border-black text-xs ${scheduleType === 'custom' ? 'font-bold' : ''}`}
              style={{ backgroundColor: scheduleType === 'custom' ? '#5D2E0A' : '#8B4513' }}
            >
              Custom
            </button>
          </div>
          
          {/* Weekly day selection */}
          {scheduleType === 'weekly' && (
            <div className="flex gap-0.5 mt-1 flex-wrap">
              {DAY_NAMES.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-1.5 py-0.5 text-black border-2 border-black text-xs ${selectedDays.includes(index) ? 'font-bold' : 'opacity-60'}`}
                  style={{ backgroundColor: selectedDays.includes(index) ? '#5D2E0A' : '#8B4513' }}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
          
          {/* Custom days input */}
          {scheduleType === 'custom' && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-black text-xs">Every</span>
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                className="w-12 px-1 py-0.5 text-black border-2 border-black text-xs text-center"
                style={{ backgroundColor: '#8B4513' }}
              />
              <span className="text-black text-xs">days</span>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="px-2 py-1 text-black border-2 border-black text-sm"
          style={{ backgroundColor: '#5D2E0A' }}
        >
          Create Activity
        </button>
      </form>

      {isAddingActivity && (
        <div className="mt-1 sm:mt-2">
          <h3 className="text-black mb-1 text-sm">Add Markers 🍞</h3>
          
          <div className="flex gap-1 sm:gap-2 mb-1">
            <input
              type="text"
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              placeholder="Marker label"
              className="flex-1 px-2 py-1 text-black border-2 border-black text-sm"
              style={{ backgroundColor: '#8B4513', color: '#000' }}
            />
            <button
              onClick={handleAddMarker}
              className="px-2 py-1 text-black border-2 border-black text-sm"
              style={{ backgroundColor: '#5D2E0A' }}
            >
              Add
            </button>
          </div>

          <div className="mt-1">
            <h4 className="text-black mb-0.5 text-sm">Markers:</h4>
            <ul className="space-y-0.5">
              {markers.map((marker) => (
                <li key={marker.id} className="flex items-center text-black text-sm">
                  <span className="mr-1">🍞</span>
                  {marker.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-1">
            <button
              onClick={() => {
                setIsAddingActivity(false);
                setActivityId(null);
              }}
              className="px-2 py-1 text-black border-2 border-black text-sm"
              style={{ backgroundColor: '#5D2E0A' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}