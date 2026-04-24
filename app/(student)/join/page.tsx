'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { randomAvatarColor } from '@/lib/utils';
import { sfx } from '@/lib/sound/engine';

const EMOJIS = ['😎', '🦁', '🐯', '🦊', '🐺', '🦅', '🐉', '🌟', '⚡', '🔥', '🎯', '🏆', '🚀', '💎', '🎮', '🦋'];

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'code' | 'profile'>('code');
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [avatarColor] = useState(randomAvatarColor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<{ id: string; title: string; host: string } | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-advance if code pre-filled via URL
  useEffect(() => {
    if (searchParams.get('code')) verifyCode(searchParams.get('code')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'profile') nameInputRef.current?.focus();
  }, [step]);

  // ─── Verify code ───
  const verifyCode = async (rawCode: string) => {
    const cleaned = rawCode.replace(/\s/g, '');
    if (cleaned.length !== 6) { setError('الكود يجب أن يتكون من 6 أرقام'); return; }

    setLoading(true);
    setError('');

    const { data: session } = await supabase
      .from('live_sessions')
      .select('id, status, activity_id, activities(title, users(full_name))')
      .eq('session_code', cleaned)
      .in('status', ['waiting', 'active'])
      .single();

    setLoading(false);

    if (!session) {
      setError('الكود غير صحيح أو انتهت الجلسة — تحقق من المعلم');
      sfx.wrong?.();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const act = (session as any).activities;
    setSessionInfo({
      id: session.id,
      title: act?.title ?? 'مسابقة',
      host: act?.users?.full_name ?? 'المعلم',
    });

    sfx.select?.();
    setCode(cleaned);
    setStep('profile');
  };

  // ─── Join session ───
  const joinSession = async () => {
    if (!displayName.trim()) { setError('من فضلك أدخل اسمك'); nameInputRef.current?.focus(); return; }
    if (!sessionInfo) return;

    setLoading(true);
    setError('');

    try {
      // Check for existing participant with same name
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', sessionInfo.id)
        .eq('display_name', displayName.trim())
        .single();

      if (existing) {
        // Rejoin existing participant
        localStorage.setItem(`participant_${sessionInfo.id}`, existing.id);
        sfx.join?.();
        router.push(`/play/${sessionInfo.id}`);
        return;
      }

      // Create new participant
      const { data: participant, error: pErr } = await supabase
        .from('participants')
        .insert({
          session_id: sessionInfo.id,
          display_name: displayName.trim(),
          avatar_color: avatarColor,
          avatar_emoji: selectedEmoji,
          total_score: 0,
          correct_count: 0,
          wrong_count: 0,
          avg_time_ms: 0,
          is_online: true,
        })
        .select('id')
        .single();

      if (pErr || !participant) throw pErr ?? new Error('Failed to join');

      localStorage.setItem(`participant_${sessionInfo.id}`, participant.id);
      sfx.join?.();
      router.push(`/play/${sessionInfo.id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'فشل الانضمام';
      setError(msg);
      sfx.wrong?.();
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background:
          'radial-gradient(ellipse at 20% 0%, rgba(124,77,255,.22), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(255,51,102,.18), transparent 50%), var(--bg)',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎯</div>
        <h1 style={{ fontFamily: 'var(--font-cairo)', fontSize: 32, fontWeight: 900, color: 'var(--text)', margin: 0 }}>
          Quiz<span style={{ color: 'var(--pink)' }}>Arena</span>
        </h1>
      </div>

      <div
        className="card-panel"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* ─── STEP 1: Code ─── */}
        {step === 'code' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 22, margin: '0 0 8px' }}>
                أدخل كود الجلسة
              </h2>
              <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', fontSize: 14, margin: 0 }}>
                اطلب الكود من معلمك
              </p>
            </div>

            <input
              ref={codeInputRef}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode(code)}
              placeholder="× × × × × ×"
              maxLength={6}
              className="input-field"
              style={{
                textAlign: 'center',
                fontSize: 36,
                fontFamily: 'var(--font-space-grotesk)',
                fontWeight: 900,
                letterSpacing: 14,
                padding: '18px 16px',
                color: 'var(--pink)',
              }}
              inputMode="numeric"
              dir="ltr"
              autoFocus
            />

            {error && <ErrorMsg msg={error} />}

            <button
              className="btn-primary"
              onClick={() => verifyCode(code)}
              disabled={loading || code.length < 6}
              style={{ padding: '16px 24px', fontSize: 16 }}
            >
              {loading ? '⏳ جاري التحقق...' : '✅ دخول'}
            </button>
          </>
        )}

        {/* ─── STEP 2: Profile ─── */}
        {step === 'profile' && sessionInfo && (
          <>
            {/* Session info */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                background: 'rgba(0,230,118,.08)',
                border: '1px solid rgba(0,230,118,.25)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-cairo)', marginBottom: 4 }}>
                ✅ تم التحقق من الجلسة
              </div>
              <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 17, color: 'var(--text)' }}>
                {sessionInfo.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', marginTop: 2 }}>
                المعلم: {sessionInfo.host}
              </div>
            </div>

            {/* Avatar preview */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: avatarColor,
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 36,
                  marginBottom: 12,
                  boxShadow: `0 0 24px ${avatarColor}66`,
                  border: '3px solid var(--text)',
                }}
              >
                {selectedEmoji}
              </div>
              {/* Emoji picker */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setSelectedEmoji(e); sfx.click?.(); }}
                    style={{
                      fontSize: 22,
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: selectedEmoji === e ? '2px solid var(--pink)' : '1px solid var(--border)',
                      background: selectedEmoji === e ? 'rgba(255,51,102,.15)' : 'var(--bg-2)',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>✏️ اسمك في الجلسة</label>
              <input
                ref={nameInputRef}
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && joinSession()}
                placeholder="اكتب اسمك هنا..."
                className="input-field"
                maxLength={30}
                style={{ fontFamily: 'var(--font-cairo)', fontSize: 16, textAlign: 'right' }}
              />
            </div>

            {error && <ErrorMsg msg={error} />}

            <button
              className="btn-primary"
              onClick={joinSession}
              disabled={loading || !displayName.trim()}
              style={{ padding: '16px 24px', fontSize: 16 }}
            >
              {loading ? '⏳ جاري الانضمام...' : '🚀 انضم الآن'}
            </button>

            <button
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-cairo)' }}
              onClick={() => { setStep('code'); setError(''); }}
            >
              ← تغيير الكود
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: '10px 16px', borderRadius: 10,
      background: 'rgba(255,23,68,.12)', border: '1px solid var(--danger)',
      color: 'var(--danger)', fontSize: 13, fontFamily: 'var(--font-tajawal)', textAlign: 'center',
    }}>
      {msg}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700,
  color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--font-cairo)',
};
export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}