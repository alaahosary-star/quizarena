'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { createClient } from '@/lib/supabase/client';

interface SessionRow {
  id: string;
  session_code: string;
  status: string;
  mode: string;
  created_at: string;
  ended_at: string | null;
  current_question_index: number;
  activity_id: string;
  activity_title: string;
  participant_count: number;
  avg_score: number;
}

const isCompleted = (status: string) => ['completed', 'finished', 'ended'].includes(status);

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'live' | 'homework'>('all');
  const [search, setSearch] = useState('');
  const [endingId, setEndingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: rawSessions } = await supabase
        .from('live_sessions')
        .select('*, activities(title)')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (!rawSessions) { setLoading(false); return; }

      const enriched: SessionRow[] = await Promise.all(
        rawSessions.map(async (s: any) => {
          const { count } = await supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', s.id);

          const { data: parts } = await supabase
            .from('participants')
            .select('total_score')
            .eq('session_id', s.id);

          const avg = parts && parts.length > 0
            ? Math.round(parts.reduce((sum: number, p: any) => sum + (p.total_score || 0), 0) / parts.length)
            : 0;

          return {
            id: s.id,
            session_code: s.session_code,
            status: s.status,
            mode: s.mode ?? 'live',
            created_at: s.created_at,
            ended_at: s.ended_at,
            current_question_index: s.current_question_index,
            activity_id: s.activity_id,
            activity_title: (s.activities as any)?.title ?? 'بدون عنوان',
            participant_count: count ?? 0,
            avg_score: avg,
          };
        })
      );

      setSessions(enriched);
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = async (sessionId: string) => {
    if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;
    setEndingId(sessionId);
    try {
      const { error } = await supabase
        .from('live_sessions')
        .update({ status: 'finished', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, status: 'finished', ended_at: new Date().toISOString() } : s
      ));
    } catch (err) {
      console.error(err);
      alert('فشل إنهاء الجلسة');
    } finally {
      setEndingId(null);
    }
  };

  const filtered = sessions.filter((s) => {
    if (filter === 'completed' && !isCompleted(s.status)) return false;
    if (filter === 'active' && isCompleted(s.status)) return false;
    if (modeFilter === 'live' && s.mode !== 'live') return false;
    if (modeFilter === 'homework' && s.mode !== 'homework') return false;
    if (search && !s.activity_title.toLowerCase().includes(search.toLowerCase()) && !s.session_code.includes(search)) return false;
    return true;
  });

  const totalSessions = sessions.length;
  const totalParticipants = sessions.reduce((s, r) => s + r.participant_count, 0);
  const completedSessions = sessions.filter(s => isCompleted(s.status)).length;
  const activeSessions = sessions.filter(s => !isCompleted(s.status)).length;
  const liveSessions = sessions.filter(s => s.mode === 'live').length;
  const homeworkSessions = sessions.filter(s => s.mode === 'homework').length;
  const overallAvg = sessions.length > 0
    ? Math.round(sessions.reduce((s, r) => s + r.avg_score, 0) / sessions.length)
    : 0;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const statusInfo = (status: string) => {
    if (isCompleted(status)) return { label: 'مكتملة', color: 'var(--green)', bg: 'rgba(0,230,118,.12)' };
    switch (status) {
      case 'active': return { label: 'نشطة', color: 'var(--blue)', bg: 'rgba(41,121,255,.12)' };
      case 'waiting': return { label: 'انتظار', color: 'var(--yellow)', bg: 'rgba(255,214,0,.12)' };
      case 'paused': return { label: 'متوقفة', color: 'var(--purple)', bg: 'rgba(124,77,255,.12)' };
      default: return { label: status, color: 'var(--muted)', bg: 'var(--bg-2)' };
    }
  };

  const modeInfo = (mode: string) => {
    if (mode === 'homework') return { label: '📚 واجب', color: 'var(--purple)', bg: 'rgba(124,77,255,.12)' };
    return { label: '🎮 مباشر', color: 'var(--pink)', bg: 'rgba(255,23,68,.12)' };
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 6 }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}>لوحة التحكم</Link> ← التقارير
          </div>
          <h1 style={{ fontSize: 32, fontFamily: 'var(--font-cairo)' }}>
            📊 التقارير والتحليلات
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 32 }}>
          <StatCard icon="🎮" label="إجمالي الجلسات" value={String(totalSessions)} color="var(--pink)" />
          <StatCard icon="📡" label="مباشر" value={String(liveSessions)} color="var(--pink)" />
          <StatCard icon="📚" label="واجب" value={String(homeworkSessions)} color="var(--purple)" />
          <StatCard icon="✅" label="مكتملة" value={String(completedSessions)} color="var(--green)" />
          <StatCard icon="🔴" label="نشطة" value={String(activeSessions)} color="var(--blue)" />
          <StatCard icon="👥" label="المشاركين" value={String(totalParticipants)} color="var(--yellow)" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontFamily: 'var(--font-cairo)' }}>📋 سجل الجلسات</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Status filter */}
            <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
              {([
                { k: 'all', label: 'الكل', n: sessions.length },
                { k: 'completed', label: 'مكتملة', n: completedSessions },
                { k: 'active', label: 'نشطة', n: activeSessions },
              ] as { k: 'all' | 'completed' | 'active'; label: string; n: number }[]).map(({ k, label, n }) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 0,
                    background: filter === k ? 'var(--bg-2)' : 'transparent',
                    color: filter === k ? 'var(--text)' : 'var(--muted)',
                    fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {label}
                  {n > 0 && (
                    <span style={{
                      padding: '1px 6px', borderRadius: 999, fontSize: 10,
                      background: filter === k ? 'var(--pink)' : 'var(--border)',
                      color: filter === k ? '#fff' : 'var(--muted)',
                      fontFamily: 'var(--font-space-grotesk)',
                    }}>{n}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Mode filter */}
            <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
              {([
                { k: 'all', label: 'الكل' },
                { k: 'live', label: '🎮 مباشر' },
                { k: 'homework', label: '📚 واجب' },
              ] as { k: 'all' | 'live' | 'homework'; label: string }[]).map(({ k, label }) => (
                <button
                  key={k}
                  onClick={() => setModeFilter(k)}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: 0,
                    background: modeFilter === k ? 'var(--bg-2)' : 'transparent',
                    color: modeFilter === k ? 'var(--text)' : 'var(--muted)',
                    fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 ابحث..."
              className="input-field"
              style={{ maxWidth: 200, padding: '10px 14px' }}
            />
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⚙️</div>
            <p style={{ fontFamily: 'var(--font-cairo)' }}>جارٍ التحميل...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-panel" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>{sessions.length > 0 ? '🔍' : '🎮'}</div>
            <h3 style={{ fontSize: 20, marginBottom: 8, fontFamily: 'var(--font-cairo)' }}>
              {sessions.length > 0 ? 'لا توجد نتائج مطابقة' : 'لم تُقم أي جلسات بعد'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20, fontFamily: 'var(--font-cairo)' }}>
              {sessions.length > 0
                ? 'جرّب تغيير الفلتر أو مسح البحث.'
                : 'ابدأ جلسة مباشرة من لوحة التحكم وستظهر النتائج هنا.'}
            </p>
            {sessions.length === 0 && (
              <Link href="/dashboard" className="btn-primary" style={{ textDecoration: 'none' }}>
                ← العودة للوحة التحكم
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((s) => {
              const st = statusInfo(s.status);
              const md = modeInfo(s.mode);
              const isActive = !isCompleted(s.status);
              return (
                <div
                  key={s.id}
                  className="card-panel"
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    borderInlineStart: `4px solid ${md.color}`,
                  }}
                >
                  {/* Activity info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontFamily: 'var(--font-cairo)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.activity_title}
                      </h3>
                      {/* Mode badge */}
                      <span style={{
                        padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: md.bg, color: md.color, fontFamily: 'var(--font-cairo)',
                        border: `1px solid ${md.color}`,
                      }}>
                        {md.label}
                      </span>
                      {/* Status badge */}
                      <span style={{
                        padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                        background: st.bg, color: st.color, fontFamily: 'var(--font-cairo)',
                        border: `1px solid ${st.color}`,
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>
                      <span>🔑 {s.session_code}</span>
                      <span>📅 {formatDate(s.created_at)}</span>
                      <span>🕐 {formatTime(s.created_at)}</span>
                      {s.ended_at && <span>🏁 {formatTime(s.ended_at)}</span>}
                    </div>
                  </div>

                  {/* Stats + Actions */}
                  <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 20, color: 'var(--blue)' }}>
                        {s.participant_count}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>مشارك</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 20, color: 'var(--yellow)' }}>
                        {s.avg_score.toLocaleString('ar-EG')}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>متوسط</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {isActive && (
                        <button
                          onClick={() => endSession(s.id)}
                          disabled={endingId === s.id}
                          style={{
                            padding: '8px 14px', borderRadius: 10, border: '1px solid var(--danger)',
                            background: 'rgba(255,23,68,.12)', color: 'var(--danger)',
                            fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {endingId === s.id ? '...' : '⏹ إنهاء'}
                        </button>
                      )}
                      <Link
                        href={`/results/${s.id}`}
                        style={{
                          padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)',
                          background: 'var(--bg-2)', color: 'var(--text)',
                          fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 12,
                          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        📊 التفاصيل
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="card-panel" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -10, insetInlineEnd: -10, fontSize: 56, opacity: 0.07,
        transform: 'rotate(-12deg)',
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 28, color }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
