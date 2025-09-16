'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pwd) return;

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: pwd });
    setLoading(false);

    if (error) {
      alert(error.message || 'Failed to update password');
      return;
    }
    alert('Password updated. You are now signed in.');
    router.replace('/dashboard');
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Set a new password</h1>
      <form onSubmit={submit} className="grid gap-3">
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="New password"
          className="border rounded px-3 py-2"
          minLength={8}
          required
        />
        <button className="border rounded px-4 py-2" disabled={loading}>
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </main>
  );
}
