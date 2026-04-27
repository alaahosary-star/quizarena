'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تغيير كلمة المرور';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="card-panel" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>تغيير كلمة المرور</h1>
        <p style={{ color: 'var(--muted)', textAlign: 'center', marginBottom: 28, fontSize: 14 }}>
          اكتب كلمة المرور الجديدة
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-cairo)' }}>
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              minLength={6}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-cairo)' }}>
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ padding: 12, background: 'rgba(255,23,68,.12)', border: '1px solid var(--danger)', borderRadius: 10, color: 'var(--danger)', fontSize: 14, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: 12, background: 'rgba(0,230,118,.12)', border: '1px solid var(--green)', borderRadius: 10, color: 'var(--green)', fontSize: 14, textAlign: 'center' }}>
              تم تغيير كلمة المرور بنجاح! جارٍ التوجيه...
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
            {loading ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
