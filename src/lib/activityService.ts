// services/activityService.ts

import { Activity, ActivityMarker, DailyRecord, ActivitySchedule } from '@/types';
import { supabase } from '@/lib/supabase';

// Activity operations
export const createActivity = async (userId: string, name: string, schedule?: ActivitySchedule): Promise<Activity> => {
  const insertData: { user_id: string; name: string; schedule?: string } = { user_id: userId, name };
  
  // Store schedule as JSON string (for compatibility with databases that don't have native JSON support)
  if (schedule) {
    insertData.schedule = JSON.stringify(schedule);
  }
  
  const { data, error } = await supabase
    .from('activities')
    .insert([insertData])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    schedule: data.schedule ? JSON.parse(data.schedule) : undefined,
    createdAt: new Date(data.created_at),
  };
};

export const getActivities = async (userId: string): Promise<Activity[]> => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    name: item.name,
    schedule: item.schedule ? (typeof item.schedule === 'string' ? JSON.parse(item.schedule) : item.schedule) : undefined,
    createdAt: new Date(item.created_at),
  }));
};

// Activity Marker operations
export const createActivityMarker = async (
  activityId: string, 
  label: string, 
  options?: { isDefault?: boolean; target?: number }
): Promise<ActivityMarker> => {
  const insertData: { activity_id: string; label: string; is_default?: boolean; target?: number } = { 
    activity_id: activityId, 
    label 
  };
  
  if (options?.isDefault !== undefined) {
    insertData.is_default = options.isDefault;
  }
  if (options?.target !== undefined) {
    insertData.target = options.target;
  }
  
  const { data, error } = await supabase
    .from('activity_markers')
    .insert([insertData])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    activityId: data.activity_id,
    label: data.label,
    isDefault: data.is_default || false,
    target: data.target || undefined,
    createdAt: new Date(data.created_at),
  };
};

export const getActivityMarkers = async (activityId: string): Promise<ActivityMarker[]> => {
  const { data, error } = await supabase
    .from('activity_markers')
    .select('*')
    .eq('activity_id', activityId);
  
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    activityId: item.activity_id,
    label: item.label,
    isDefault: item.is_default || false,
    target: item.target || undefined,
    createdAt: new Date(item.created_at),
  }));
};

export const updateMarkerTarget = async (markerId: string, target: number | null): Promise<ActivityMarker> => {
  const { data, error } = await supabase
    .from('activity_markers')
    .update({ target })
    .eq('id', markerId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    activityId: data.activity_id,
    label: data.label,
    isDefault: data.is_default || false,
    target: data.target || undefined,
    createdAt: new Date(data.created_at),
  };
};

// Helper function to format date as YYYY-MM-DD using local time (not UTC)
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Daily Record operations
export const createDailyRecord = async (
  userId: string,
  activityMarkerId: string,
  date: Date,
  completed: boolean = true,
  target?: number // Store the current target at time of completion
): Promise<DailyRecord> => {
  const dateString = formatDateLocal(date);
  
  const insertData: {
    user_id: string;
    activity_marker_id: string;
    date: string;
    completed: boolean;
    target?: number;
  } = {
    user_id: userId,
    activity_marker_id: activityMarkerId,
    date: dateString,
    completed,
  };
  
  if (target !== undefined) {
    insertData.target = target;
  }
  
  const { data, error } = await supabase
    .from('daily_records')
    .insert([insertData])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    activityMarkerId: data.activity_marker_id,
    dateString: data.date,
    date: new Date(data.date + 'T00:00:00'),
    completed: data.completed,
    target: data.target || undefined,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    createdAt: new Date(data.created_at),
  };
};

export const updateDailyRecord = async (
  recordId: string,
  completed: boolean
): Promise<DailyRecord> => {
  const { data, error } = await supabase
    .from('daily_records')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', recordId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    activityMarkerId: data.activity_marker_id,
    dateString: data.date,
    date: new Date(data.date + 'T00:00:00'),
    completed: data.completed,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    createdAt: new Date(data.created_at),
  };
};

export const deleteDailyRecord = async (recordId: string): Promise<void> => {
  const { error } = await supabase
    .from('daily_records')
    .delete()
    .eq('id', recordId);
  
  if (error) throw error;
};

export const getDailyRecords = async (
  userId: string,
  date: Date
): Promise<DailyRecord[]> => {
  const dateString = formatDateLocal(date);
  
  const { data, error } = await supabase
    .from('daily_records')
    .select(`
      id,
      user_id,
      activity_marker_id,
      date,
      completed,
      target,
      completed_at,
      created_at
    `)
    .eq('user_id', userId)
    .eq('date', dateString);
  
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    activityMarkerId: item.activity_marker_id,
    dateString: item.date,
    date: new Date(item.date + 'T00:00:00'),
    completed: item.completed,
    target: item.target || undefined,
    completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
    createdAt: new Date(item.created_at),
  }));
};

export const getDailyRecordsForActivity = async (
  userId: string,
  dateRangeStart: Date,
  dateRangeEnd: Date
): Promise<DailyRecord[]> => {
  const startDateString = formatDateLocal(dateRangeStart);
  const endDateString = formatDateLocal(dateRangeEnd);
  
  const { data, error } = await supabase
    .from('daily_records')
    .select(`
      id,
      user_id,
      activity_marker_id,
      date,
      completed,
      target,
      completed_at,
      created_at
    `)
    .eq('user_id', userId)
    .gte('date', startDateString)
    .lte('date', endDateString);
  
  if (error) throw error;
  
  return data.map(item => ({
    id: item.id,
    userId: item.user_id,
    activityMarkerId: item.activity_marker_id,
    dateString: item.date,
    date: new Date(item.date + 'T00:00:00'),
    completed: item.completed,
    target: item.target || undefined,
    completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
    createdAt: new Date(item.created_at),
  }));
};