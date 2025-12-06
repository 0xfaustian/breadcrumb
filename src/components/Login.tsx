'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/userContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { login } = useUser();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    try {
      setError(''); // Clear any previous errors
      await login(username.trim());
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message) {
        setError(`Login failed: ${err.message}`);
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#8B4513' }}>
      <div className="max-w-md w-full space-y-4 px-4">
        <div>
          <h2 className="text-center text-2xl text-black mb-2">
            🍞 Breadcrumb Tracker 🍞
          </h2>
          <p className="text-center text-black">
            Enter username
          </p>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-black border-2 border-black"
              style={{ backgroundColor: '#A0522D', color: '#000' }}
              placeholder="Username"
            />
          </div>

          {error && (
            <div className="p-2 border-2 border-black" style={{ backgroundColor: '#5D2E0A' }}>
              <p className="text-black">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 text-black border-2 border-black"
              style={{ backgroundColor: '#5D2E0A' }}
            >
              Sign in 🍞
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}