'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { HostControls } from '@/components/teacher/HostControls';
import { TimerRing } from '@/components/shared/TimerRing';
import { Leaderboard } from '@/components/shared/Leaderboard';
import { QRCode } from '@/components/shared/QRCode';
import { Podium } from '@/components/shared/Podium';
import { useLiveSession } from '@/hooks/useLiveSession';
import { useTimer } from '@/hooks/useTimer';
import { createClient } from '@/lib/supabase/client';
import { sfx } from '@/lib/sound/engine';
import { formatSessionCode, launchConfetti } from '@/lib/utils';
import type { Question, Choice } from '@/lib/supabase/types';

type HostTab = 'control' | 'leaderboard' | 'qr';

export default function HostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const { session, participants, answers, loading } = useLiveSession(sessionId);
  const [questions, setQuestions] = useState<(Question & { choices: Choice[] })[]>([]);
  const [activityTitle, setActivityTitle] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<HostTab>('control');
  const [joinUrl, setJoinUrl] = useState('');
  const [showPodium, setShowPodium] = useState(false);
  const confettiLaunched = useRef(false);

  const currentQ = questions[session?.current_question ?? 0];
  const timer = useTimer(currentQ?.time_limit ?? 30, () => {});

  // ─── Load questions ───
  useEffect(() => {
    if (!session?.activity_id) return;
    const load = async () => {
      const { data: act } = await supabase
        .from('activities')
        .select('title')
        .eq('id', session.activity_id)
        .single();
      if (act) setActivityTitle(act.title);

      const { data: qs } = await supabase
        .from('questions')
        .select('*, choices(*)')
        .eq('activity_id', session.activity_id)
        .order('order_index');

      if (qs) {
        setQuestions(
          qs.map((q) => ({
            ...q,
            choices: (q.choices ?? []).sort((a: Choice, b: Choice) => a.order_index - b.order_index),
          }))
        );
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.activity_id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && session?.session_code) {
      setJoinUrl(`${window.location.origin}/join?code=${session.session_code}`);
    }
  }, [session?.session_code]);

  useEffect(() => {
    if (session?.status === 'finished' && !confettiLaunched.current) {
      confettiLaunched.current = true;
      launchConfetti(120);
      setTimeout(() => setShowPodium(true), 800);
    }
  }, [session?.status]);

  useEffect(() => {
    timer.reset();
    if (session?.status === 'active' && currentQ) {
      const t = setTimeout(() => timer.start(), 1000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.current_question, session?.status]);

  const callAPI = useCallback(async (path: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/${path}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`API ${path} failed:`, err);
      }
    } finally {
      setActionLoading(false);
    }
  }, [sessionId]);

  const handleStart = async () => {
    timer.reset();
    await callAPI('start');
    sfx.correct?.();
  };

  const handleNext = async () => {
    timer.stop();
    timer.reset();
    await callAPI('next');
    sfx.tick?.();
  };

  const handlePause = () => callAPI('pause');
  const handleResume = () => callAPI('resume');

  const handleEnd = async () => {
    timer.stop();
    await callAPI('end');
  };

  if (loading) return <LoadingScreen />;
  if (!session) return <NotFound router={router} />;

  const isWaiting = session.status === 'waiting';
  const isFinished = session.status === 'finished';
  const currentIndex = session.current_question ?? 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(11,11,30,.94)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Link href="/dashboard" style={backBtnStyle}>←</Link>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 17, color: 'var(--text)' }}>
            {activityTitle || 'جلسة مباشرة'}
          </div>
          <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 22, fontWeight: 900, color: 'var(--pink)', letterSpacing: 4 }}>
            {formatSessionCode(session.session_code)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <MetaBadge label={`${participants.length} طالب`} color="var(--blue)" />
          {!isWaiting && !isFinished && (
            <MetaBadge label={`${currentIndex + 1}/${questions.length}`} color="var(--yellow)" />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
        {(['control', 'leaderboard', 'qr'] as HostTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '13px 18px', background: 'transparent', border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--pink)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
            fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>
            {tab === 'control' ? '🎛 التحكم' : tab === 'leaderboard' ? `🏆 المتصدرون (${participants.length})` : '📱 QR'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, maxWidth: 1300, width: '100%', margin: '0 auto', padding: 24, alignItems: 'start' }}>

        <div style={{ paddingLeft: 24 }}>
          {activeTab === 'control' && (
            <>
              {isWaiting && <WaitingScreen session={session} participants={participants} joinUrl={joinUrl} />}
              {!isWaiting && !isFinished && currentQ && (
                <QuestionPreview 
                  question={currentQ} 
                  timer={timer} 
                  answers={answers.filter(a => a.question_id === currentQ.id)}
                  totalParticipants={participants.length}
                />
              )}
              {isFinished && showPodium && <Podium top3={participants.slice(0, 3)} />}
              {isFinished && !showPodium && (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
                  <div style={{ fontSize: 60 }}>🎊</div>
                </div>
              )}
            </>
          )}

          {activeTab === 'leaderboard' && (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Leaderboard participants={participants} answers={answers} questionIds={questions.map(q => q.id)} />
            </div>
          )}

          {activeTab === 'qr' && joinUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingTop: 40 }}>
              <QRCode value={joinUrl} size={300} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-cairo)', marginBottom: 8 }}>رابط الانضمام</div>
                <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 15, color: 'var(--text)', wordBreak: 'break-all', maxWidth: 400 }}>{joinUrl}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-cairo)' }}>أو بالكود</div>
                <div style={{ fontSize: 52, fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, color: 'var(--pink)', letterSpacing: 12 }}>
                  {formatSessionCode(session.session_code)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card-panel" style={{ position: 'sticky', top: 90, padding: 20 }}>
          <HostControls
            session={session}
            currentQuestion={currentIndex}
            totalQuestions={questions.length}
            timerRunning={timer.running}
            timerLeft={timer.left}
            onStart={handleStart}
            onNext={handleNext}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
            onStartTimer={timer.start}
            onStopTimer={timer.stop}
            loading={actionLoading}
          />
        </div>
      </div>
    </div>
  );
}

function WaitingScreen({
  session,
  participants,
  joinUrl,
}: {
  session: { session_code: string };
  participants: { id: string; display_name: string; avatar_color: string }[];
  joinUrl: string;
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-cairo)', fontSize: 22, marginBottom: 24, color: 'var(--text)' }}>
        في انتظار الطلاب...
      </h2>
      <div style={{
        fontSize: 72, fontFamily: 'var(--font-space-grotesk)', fontWeight: 900,
        color: 'var(--pink)', letterSpacing: 16, marginBottom: 16,
        textShadow: '0 0 40px rgba(255,51,102,.5)',
      }}>
        {formatSessionCode(session.session_code)}
      </div>
      <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-tajawal)', marginBottom: 32 }}>
        ادخل الكود على <strong style={{ color: 'var(--text)' }}>{joinUrl.split('/join')[0]}/join</strong>
      </p>

      {participants.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-cairo)', fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
            {participants.length} طالب انضم
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxHeight: 250, overflowY: 'auto' }}>
            {participants.map((p) => (
              <div key={p.id} style={{
                padding: '8px 14px', borderRadius: 999,
                background: `${p.avatar_color}22`, border: `1px solid ${p.avatar_color}55`,
                color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-cairo)',
                animation: 'fadeIn .4s ease',
              }}>
                {p.display_name}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(.9); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );
}

function QuestionPreview({
  question,
  timer,
  answers,
  totalParticipants,
}: {
  question: Question & { choices: Choice[] };
  timer: ReturnType<typeof useTimer>;
  answers: { participant_id: string; question_id: string; is_correct: boolean; skipped: boolean }[];
  totalParticipants: number;
}) {
  const CHOICE_COLORS = ['#FF3366', '#3D5AFE', '#FFD700', '#00E676'];

  const answered = answers.length;
  const correct = answers.filter(a => a.is_correct && !a.skipped).length;
  const wrong = answers.filter(a => !a.is_correct || a.skipped).length;
  const correctPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats bar — Kahoot style */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--card)',
        border: '1px solid var(--border)',
      }}>
        <StatCell label="أجابوا" value={`${answered}/${totalParticipants}`} color="var(--blue)" />
        <StatCell label="صحيحة" value={String(correct)} color="#00E676" />
        <StatCell label="خاطئة" value={String(wrong)} color="#FF1744" />
        <StatCell label="نسبة الصح" value={`${correctPct}%`} color="var(--yellow)" />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <TimerRing
          left={timer.left}
          percent={timer.percent}
          phase={timer.phase}
          size={90}
        />
        <div style={{ flex: 1 }}>
          {question.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.image_url} alt="صورة السؤال"
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, marginBottom: 12 }} />
          )}
          <p style={{ fontFamily: 'var(--font-tajawal)', fontSize: 20, lineHeight: 1.7, color: 'var(--text)', margin: 0 }}>
            {question.question_text}
          </p>
        </div>
      </div>

      {question.choices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {question.choices.map((c, i) => (
            <div key={c.id} style={{
              padding: '14px 18px', borderRadius: 14,
              background: `${CHOICE_COLORS[i % 4]}18`,
              border: `1.5px solid ${CHOICE_COLORS[i % 4]}55`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8,
                background: CHOICE_COLORS[i % 4], color: '#0B0B1E',
                display: 'grid', placeItems: 'center',
                fontFamily: 'var(--font-space-grotesk)', fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>
                {['أ', 'ب', 'ج', 'د'][i] ?? i + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 15, color: 'var(--text)' }}>
                {c.choice_text}
              </span>
              {c.is_correct && <span style={{ marginRight: 'auto', color: 'rgba(0,230,118,0.25)', fontSize: 11, fontWeight: 600 }}>•</span>}
            </div>
          ))}
        </div>
      )}

      {question.explanation && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,215,0,.08)', border: '1px solid rgba(255,215,0,.2)', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-tajawal)' }}>
          💡 {question.explanation}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-space-grotesk)',
        fontWeight: 900, fontSize: 22, color, lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'var(--font-cairo)', fontSize: 11,
        color: 'var(--muted)', marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

function MetaBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ padding: '5px 12px', borderRadius: 999, background: `${color}20`, color, fontFamily: 'var(--font-space-grotesk)', fontWeight: 700, fontSize: 13 }}>
      {label}
    </span>
  );
}

const backBtnStyle: React.CSSProperties = {
  color: 'var(--muted)', textDecoration: 'none', fontSize: 20, lineHeight: 1,
  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-2)', display: 'grid', placeItems: 'center',
};

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite' }}>🎛</div>
        <p style={{ fontFamily: 'var(--font-cairo)' }}>جاري تحميل الجلسة...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NotFound({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontFamily: 'var(--font-cairo)', marginBottom: 16 }}>الجلسة غير موجودة</h2>
        <button className="btn-primary" onClick={() => router.push('/dashboard')}>العودة للوحة التحكم</button>
      </div>
    </div>
  );
}