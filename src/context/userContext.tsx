'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { createNewUser, getUserByUsername } from '@/lib/userService';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (username: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user exists in localStorage on initial load
    const storedUser = localStorage.getItem('breadcrumbUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Verify the user exists in the database
        getUserByUsername(parsedUser.username)
          .then(dbUser => {
            if (dbUser && dbUser.id === parsedUser.id) {
              setUser(dbUser);
            } else {
              // Clear invalid user from localStorage
              localStorage.removeItem('breadcrumbUser');
            }
          })
          .catch(error => {
            console.error('Error verifying user from localStorage', error);
            localStorage.removeItem('breadcrumbUser');
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        localStorage.removeItem('breadcrumbUser');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string) => {
    try {
      // First check if the user already exists in the database
      let dbUser = await getUserByUsername(username);

      if (!dbUser) {
        // Create new user if they don't exist
        dbUser = await createNewUser(username);
      }

      setUser(dbUser);
      localStorage.setItem('breadcrumbUser', JSON.stringify(dbUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('breadcrumbUser');
  };

  // Show loading state while verifying user from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}