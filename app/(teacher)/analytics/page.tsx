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
  created_at: string;
  ended_at: string | null;
  current_question_index: number;
  activity_id: string;
  activity_title: string;
  participant_count: number;
  avg_score: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Get all sessions for this teacher
      const { data: rawSessions } = await supabase
        .from('live_sessions')
        .select('*, activities(title)')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (!rawSessions) { setLoading(false); return; }

      // Get participant counts and avg scores
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

  const filtered = sessions.filter((s) => {
    if (filter === 'completed' && s.status !== 'completed') return false;
    if (filter === 'active' && s.status === 'completed') return false;
    if (search && !s.activity_title.toLowerCase().includes(search.toLowerCase()) && !s.session_code.includes(search)) return false;
    return true;
  });

  const totalSessions = sessions.length;
  const totalParticipants = sessions.reduce((s, r) => s + r.participant_count, 0);
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
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
    switch (status) {
      case 'completed': return { label: 'مكتملة', color: 'var(--green)', bg: 'rgba(0,230,118,.12)' };
      case 'active': return { label: 'نشطة', color: 'var(--blue)', bg: 'rgba(41,121,255,.12)' };
      case 'waiting': return { label: 'انتظار', color: 'var(--yellow)', bg: 'rgba(255,214,0,.12)' };
      default: return { label: status, color: 'var(--muted)', bg: 'var(--bg-2)' };
    }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
          <StatCard icon="🎮" label="إجمالي الجلسات" value={String(totalSessions)} color="var(--pink)" />
          <StatCard icon="✅" label="جلسات مكتملة" value={String(completedSessions)} color="var(--green)" />
          <StatCard icon="👥" label="إجمالي المشاركين" value={String(totalParticipants)} color="var(--blue)" />
          <StatCard icon="⭐" label="متوسط النقاط" value={overallAvg.toLocaleString('ar-EG')} color="var(--yellow)" />
        </div>

        {/* Filter + Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontFamily: 'var(--font-cairo)' }}>📋 سجل الجلسات</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
              {([
                { k: 'all', label: 'الكل' },
                { k: 'completed', label: 'مكتملة' },
                { k: 'active', label: 'نشطة' },
              ] as { k: 'all' | 'completed' | 'active'; label: string }[]).map(({ k, label }) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 0,
                    background: filter === k ? 'var(--bg-2)' : 'transparent',
                    color: filter === k ? 'var(--text)' : 'var(--muted)',
                    fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
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
              placeholder="🔍 ابحث بالعنوان أو الرمز..."
              className="input-field"
              style={{ maxWidth: 240, padding: '10px 14px' }}
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
              return (
                <Link
                  key={s.id}
                  href={`/results/${s.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="card-panel"
                    style={{
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      borderInlineStart: `4px solid ${st.color}`,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(-4px)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                  >
                    {/* Activity info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontFamily: 'var(--font-cairo)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.activity_title}
                        </h3>
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
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 20, flexShrink: 0, alignItems: 'center' }}>
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
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-cairo)' }}>متوسط النقاط</div>
                      </div>
                      <div style={{ fontSize: 20, color: 'var(--muted)' }}>←</div>
                    </div>
                  </div>
                </Link>
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
