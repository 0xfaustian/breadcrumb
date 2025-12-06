'use client';

import { useUser } from '@/context/userContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, ActivityMarker, DailyRecord } from '@/types';
import { getActivities, getActivityMarkers, getDailyRecords, createActivityMarker, createDailyRecord, updateDailyRecord, deleteDailyRecord, updateMarkerTarget } from '@/lib/activityService';
import { useSearchParams } from 'next/navigation';

export default function ActivityView() {
  const { user, logout } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityId = searchParams.get('id');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [markers, setMarkers] = useState<ActivityMarker[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newMarkerLabel, setNewMarkerLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkboxCounts, setCheckboxCounts] = useState<Record<string, number>>({});
  const [visibleMarkers, setVisibleMarkers] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingTarget, setEditingTarget] = useState<string | null>(null); // markerId being edited
  const [targetInput, setTargetInput] = useState<string>('');

  // Load visible markers from localStorage for the selected date
  // By default, only the first marker is visible
  useEffect(() => {
    if (markers.length === 0) return;
    
    const dateKey = `${activityId}_visible_markers_${selectedDate.toDateString()}`;
    const stored = localStorage.getItem(dateKey);
    
    if (stored) {
      setVisibleMarkers(new Set(JSON.parse(stored)));
    } else {
      // Default: only show the first marker
      setVisibleMarkers(new Set([markers[0].id]));
    }
  }, [selectedDate, markers, activityId]);

  // Load checkbox counts from localStorage when markers are loaded
  useEffect(() => {
    if (markers.length === 0) return;
    
    const counts: Record<string, number> = {};
    markers.forEach(marker => {
      const stored = localStorage.getItem(`marker_${marker.id}_count`);
      counts[marker.id] = stored ? parseInt(stored, 10) : 10; // Default to 10 checkboxes
    });
    setCheckboxCounts(counts);
  }, [markers]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (!activityId) {
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch the specific activity
        const allActivities = await getActivities(user.id);
        const currentActivity = allActivities.find(a => a.id === activityId);
        
        if (!currentActivity) {
          router.push('/dashboard');
          return;
        }
        
        setActivity(currentActivity);
        
        // Fetch markers for this activity
        const activityMarkers = await getActivityMarkers(activityId);
        setMarkers(activityMarkers);
        
        // Fetch daily records for the selected date
        const records = await getDailyRecords(user.id, selectedDate);
        setDailyRecords(records);
      } catch (error) {
        console.error('Error fetching activity data:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activityId, router, selectedDate]);

  // Helper function to format date as YYYY-MM-DD
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddMarker = async () => {
    if (!newMarkerLabel.trim() || !activityId) return;
    
    try {
      const newMarker = await createActivityMarker(activityId, newMarkerLabel.trim());
      setMarkers([...markers, newMarker]);
      // Initialize checkbox count for new marker (default 10)
      setCheckboxCounts(prev => ({ ...prev, [newMarker.id]: 10 }));
      localStorage.setItem(`marker_${newMarker.id}_count`, '10');
      
      // Make the new marker visible for today
      const dateKey = `${activityId}_visible_markers_${selectedDate.toDateString()}`;
      const newVisible = new Set(visibleMarkers);
      newVisible.add(newMarker.id);
      setVisibleMarkers(newVisible);
      localStorage.setItem(dateKey, JSON.stringify([...newVisible]));
      
      setNewMarkerLabel('');
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error creating marker:', error);
    }
  };

  // Handle checkbox click - each checkbox represents one completion
  const handleCheckboxToggle = async (markerId: string, checkboxIndex: number) => {
    if (!user) return;
    
    try {
      // Get all completed records for this marker on this date
      const selectedDateString = formatDateLocal(selectedDate);
      const markerRecords = dailyRecords.filter(
        r => r.activityMarkerId === markerId && 
        r.dateString === selectedDateString &&
        r.completed
      );
      
      // Sort records by creation time to match checkbox order
      const sortedRecords = [...markerRecords].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );
      
      const recordForThisCheckbox = sortedRecords[checkboxIndex];
      
      if (recordForThisCheckbox) {
        // Checkbox is currently checked, uncheck it by deleting the record
        await deleteDailyRecord(recordForThisCheckbox.id);
        
        // Refresh records
        const records = await getDailyRecords(user.id, selectedDate);
        setDailyRecords(records);
      } else {
        // Checkbox is unchecked, create a new record
        // Pass the current target so it's preserved even if target changes later
        const marker = markers.find(m => m.id === markerId);
        await createDailyRecord(user.id, markerId, selectedDate, true, marker?.target);
        
        // Refresh records
        const records = await getDailyRecords(user.id, selectedDate);
        setDailyRecords(records);
        }
    } catch (error) {
      console.error('Error toggling checkbox:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Add more checkboxes to a marker
  const handleAddCheckboxes = (markerId: string, count: number) => {
    const currentCount = checkboxCounts[markerId] || 10;
    const newCount = Math.max(1, currentCount + count); // Minimum 1 checkbox
    setCheckboxCounts(prev => ({ ...prev, [markerId]: newCount }));
    localStorage.setItem(`marker_${markerId}_count`, newCount.toString());
  };

  // Check if a specific checkbox is checked
  const isCheckboxChecked = (markerId: string, checkboxIndex: number): boolean => {
    const selectedDateString = formatDateLocal(selectedDate);
    const markerRecords = dailyRecords.filter(
      r => r.activityMarkerId === markerId && 
      r.dateString === selectedDateString &&
      r.completed
    );
    
    // Sort by creation time to match checkbox order
    const sortedRecords = [...markerRecords].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    return sortedRecords.length > checkboxIndex;
  };
  
  // Get count of checked checkboxes for a marker
  const getCheckedCount = (markerId: string): number => {
    const selectedDateString = formatDateLocal(selectedDate);
    return dailyRecords.filter(
      r => r.activityMarkerId === markerId && 
      r.dateString === selectedDateString &&
      r.completed
    ).length;
  };

  // Clear all records for a marker on the current day
  const handleClearMarker = async (markerId: string) => {
    if (!user) return;
    
    const selectedDateString = formatDateLocal(selectedDate);
    const markerRecords = dailyRecords.filter(
      r => r.activityMarkerId === markerId && 
      r.dateString === selectedDateString &&
      r.completed
    );
    
    if (markerRecords.length === 0) return;
    
    if (!confirm(`Clear all ${markerRecords.length} checks for today?`)) return;
    
    try {
      // Delete all records for this marker on this date
      for (const record of markerRecords) {
        await deleteDailyRecord(record.id);
      }
      
      // Refresh records
      const records = await getDailyRecords(user.id, selectedDate);
      setDailyRecords(records);
    } catch (error) {
      console.error('Error clearing marker:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleHideMarker = (markerId: string) => {
    const dateKey = `${activityId}_visible_markers_${selectedDate.toDateString()}`;
    const newVisible = new Set(visibleMarkers);
    newVisible.delete(markerId);
    setVisibleMarkers(newVisible);
    localStorage.setItem(dateKey, JSON.stringify([...newVisible]));
  };

  const handleShowMarker = (markerId: string) => {
    const dateKey = `${activityId}_visible_markers_${selectedDate.toDateString()}`;
    const newVisible = new Set(visibleMarkers);
    newVisible.add(markerId);
    setVisibleMarkers(newVisible);
    localStorage.setItem(dateKey, JSON.stringify([...newVisible]));
    setNewMarkerLabel('');
    setShowSuggestions(false);
  };

  // Get markers that match the search query and aren't already visible
  const getSuggestions = () => {
    if (!newMarkerLabel.trim()) {
      // Show all hidden markers when field is focused but empty
      return markers.filter(m => !visibleMarkers.has(m.id));
    }
    const query = newMarkerLabel.toLowerCase();
    return markers.filter(
      m => !visibleMarkers.has(m.id) && m.label.toLowerCase().includes(query)
    );
  };

  const handleSetTarget = async (markerId: string) => {
    const target = targetInput ? parseInt(targetInput, 10) : null;
    
    try {
      const updatedMarker = await updateMarkerTarget(markerId, target);
      setMarkers(markers.map(m => m.id === markerId ? updatedMarker : m));
      setEditingTarget(null);
      setTargetInput('');
    } catch (error) {
      console.error('Error updating target:', error);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#8B4513' }}>
        <nav style={{ backgroundColor: '#5D2E0A' }} className="border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-2 py-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍞</span>
                <h1 className="text-lg">Breadcrumb Tracker</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-black">{user.username}</span>
                <button
                  onClick={logout}
                  className="px-2 py-1 text-black border-2 border-black"
                  style={{ backgroundColor: '#A0522D' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="px-2 py-2">
          <div className="text-black">Loading...</div>
        </main>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#8B4513' }}>
        <nav style={{ backgroundColor: '#5D2E0A' }} className="border-b-2 border-black">
          <div className="max-w-7xl mx-auto px-2 py-1">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍞</span>
                <h1 className="text-lg">Breadcrumb Tracker</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-black">{user.username}</span>
                <button
                  onClick={logout}
                  className="px-2 py-1 text-black border-2 border-black"
                  style={{ backgroundColor: '#A0522D' }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        <main className="px-2 py-2">
          <div className="text-black">Activity not found</div>
        </main>
      </div>
    );
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

      <main className="px-1 py-1">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
          <h2 className="text-sm sm:text-lg text-black">{activity.name} 🍞</h2>
            <a
              href="/dashboard"
            className="px-2 py-1 text-black border-2 border-black text-sm"
            style={{ backgroundColor: '#A0522D' }}
            >
            Back
            </a>
          </div>

        <div className="mb-1">
          <label htmlFor="date-picker" className="block text-black mb-0.5 text-sm">Date:</label>
            <input
              type="date"
              id="date-picker"
              value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => {
              // Parse as local date to avoid timezone issues
              const [year, month, day] = e.target.value.split('-').map(Number);
              setSelectedDate(new Date(year, month - 1, day));
            }}
            className="px-2 py-1 text-black border-2 border-black text-sm"
            style={{ backgroundColor: '#A0522D' }}
            />
          </div>

        <div className="mb-1 p-1 border-2 border-black relative" style={{ backgroundColor: '#A0522D' }}>
          <h3 className="text-black mb-0.5 text-sm">Add Marker 🍞</h3>
          <div className="flex gap-1">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMarkerLabel}
                onChange={(e) => setNewMarkerLabel(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Type to search or add new..."
                className="w-full px-2 py-1 text-black border-2 border-black text-sm"
                style={{ backgroundColor: '#8B4513', color: '#000' }}
              />
              {/* Autocomplete suggestions */}
              {showSuggestions && getSuggestions().length > 0 && (
                <div 
                  className="absolute top-full left-0 right-0 border-2 border-black border-t-0 max-h-32 overflow-y-auto z-10"
                  style={{ backgroundColor: '#8B4513' }}
                >
                  {getSuggestions().map(marker => (
              <button
                      key={marker.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleShowMarker(marker.id);
                      }}
                      className="w-full px-2 py-1 text-left text-black text-sm hover:bg-opacity-80 border-b border-black last:border-b-0"
                      style={{ backgroundColor: '#A0522D' }}
                    >
                      {marker.label}
              </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAddMarker}
              className="px-3 py-1 text-black border-2 border-black text-sm"
              style={{ backgroundColor: '#5D2E0A' }}
              title="Create new marker"
            >
              New
            </button>
          </div>
          {markers.filter(m => !visibleMarkers.has(m.id)).length > 0 && (
            <p className="text-black text-xs mt-1 opacity-75">
              {markers.filter(m => !visibleMarkers.has(m.id)).length} more marker{markers.filter(m => !visibleMarkers.has(m.id)).length > 1 ? 's' : ''} available
            </p>
          )}
          </div>

        <div className="p-1 border-2 border-black" style={{ backgroundColor: '#A0522D' }}>
          <h3 className="text-black mb-1">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} 🍞
            </h3>
            
            {markers.length === 0 ? (
            <p className="text-black text-sm">No markers. Create a new marker above to start tracking.</p>
          ) : markers.filter(m => visibleMarkers.has(m.id)).length === 0 ? (
            <p className="text-black text-sm">No markers for today. Type above to add existing markers or create new ones.</p>
          ) : (
            <div className="space-y-1">
              {markers.filter(m => visibleMarkers.has(m.id)).map(marker => {
                const checkboxCount = checkboxCounts[marker.id] || 10;
                const completedCount = getCheckedCount(marker.id);
                  
                  return (
                  <div key={marker.id} className="p-1 border-2 border-black" style={{ backgroundColor: '#8B4513' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-black font-bold text-sm">{marker.label}</span>
                        {marker.target && (
                          <span 
                            className={`text-xs px-1 border border-black ${completedCount >= marker.target ? 'bg-green-800' : ''}`}
                            style={{ backgroundColor: completedCount >= marker.target ? '#228B22' : '#5D2E0A' }}
                          >
                            {completedCount}/{marker.target} ✓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {/* Target editing */}
                        {editingTarget === marker.id ? (
                          <div className="flex items-center gap-0.5 mr-1">
                            <input
                              type="number"
                              min="1"
                              value={targetInput}
                              onChange={(e) => setTargetInput(e.target.value)}
                              placeholder={marker.target?.toString() || '∞'}
                              className="w-10 px-1 py-0.5 text-black border border-black text-xs text-center"
                              style={{ backgroundColor: '#8B4513' }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSetTarget(marker.id)}
                              className="px-1 py-0.5 text-black border border-black text-xs"
                              style={{ backgroundColor: '#228B22' }}
                            >
                              ✓
                            </button>
                              <button
                              onClick={() => { setEditingTarget(null); setTargetInput(''); }}
                              className="px-1 py-0.5 text-black border border-black text-xs"
                              style={{ backgroundColor: '#8B0000' }}
                              >
                              ✕
                              </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { 
                              setEditingTarget(marker.id); 
                              setTargetInput(marker.target?.toString() || ''); 
                            }}
                            className="px-1 py-0.5 text-black border border-black text-xs mr-1"
                            style={{ backgroundColor: '#5D2E0A' }}
                            title="Set daily target"
                          >
                            🎯
                          </button>
                        )}
                        <span className="text-black text-xs sm:text-sm mr-1">{completedCount}/{checkboxCount}</span>
                        <button
                          onClick={() => handleAddCheckboxes(marker.id, -5)}
                          className="px-1 py-0.5 text-black border-2 border-black text-xs"
                          style={{ backgroundColor: '#5D2E0A' }}
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleAddCheckboxes(marker.id, -1)}
                          className="px-1 py-0.5 text-black border-2 border-black text-xs"
                          style={{ backgroundColor: '#5D2E0A' }}
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleAddCheckboxes(marker.id, 1)}
                          className="px-1 py-0.5 text-black border-2 border-black text-xs"
                          style={{ backgroundColor: '#A0522D' }}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleAddCheckboxes(marker.id, 5)}
                          className="px-1 py-0.5 text-black border-2 border-black text-xs"
                          style={{ backgroundColor: '#A0522D' }}
                        >
                          +5
                        </button>
                        {completedCount > 0 && (
                          <button
                            onClick={() => handleClearMarker(marker.id)}
                            className="px-1 py-0.5 text-black border-2 border-black text-xs"
                            style={{ backgroundColor: '#8B0000' }}
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => handleHideMarker(marker.id)}
                          className="px-1.5 py-0.5 text-black border-2 border-black text-xs font-bold"
                          style={{ backgroundColor: '#8B0000' }}
                          title="Hide this marker for today"
                        >
                          ✕
                        </button>
                      </div>
                      </div>
                      
                    {/* Row of checkboxes */}
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: checkboxCount }, (_, index) => {
                        const checked = isCheckboxChecked(marker.id, index);
                        return (
                          <label 
                            key={`${marker.id}-${index}`}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCheckboxToggle(marker.id, index);
                            }}
                          >
                          <input
                            type="checkbox"
                              checked={checked}
                            readOnly
                              style={{ 
                                backgroundColor: checked ? '#000' : '#A0522D',
                                pointerEvents: 'none'
                              }}
                            />
                          </label>
                        );
                      })}
                        </div>
                    </div>
                  );
                })}
              </div>
            )}
          
          {/* Show all markers button */}
          {markers.length > visibleMarkers.size && (
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => {
                  const dateKey = `${activityId}_visible_markers_${selectedDate.toDateString()}`;
                  const allMarkerIds = new Set(markers.map(m => m.id));
                  setVisibleMarkers(allMarkerIds);
                  localStorage.setItem(dateKey, JSON.stringify([...allMarkerIds]));
                }}
                className="px-2 py-0.5 text-black border-2 border-black text-xs"
                style={{ backgroundColor: '#A0522D' }}
              >
                Show All ({markers.length - visibleMarkers.size} more)
              </button>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}