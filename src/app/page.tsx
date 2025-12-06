'use client';

import { useUser } from '@/context/userContext';
import Login from '@/components/Login';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#8B4513' }}>
      {!user && <Login />}
    </div>
  );
}