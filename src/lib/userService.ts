// lib/userService.ts

import { User } from '@/types';
import { supabase } from '@/lib/supabase';

// Create a new user in the database
export const createNewUser = async (username: string): Promise<User> => {
  const { data, error } = await supabase
    .from('users')
    .insert([{ username }])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    username: data.username,
  };
};

// Get user by username
export const getUserByUsername = async (username: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // User not found
      return null;
    }
    throw error;
  }
  
  if (!data) {
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
  };
};

// Get user by ID
export const getUserById = async (id: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // User not found
      return null;
    }
    throw error;
  }
  
  if (!data) {
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
  };
};