import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';

/* ───── علم البحرين SVG ───── */
function BahrainFlag({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 500 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,.18)' }}
    >
      {/* الخلفية البيضاء */}
      <rect width="500" height="300" fill="#fff" />
      {/* الجزء الأحمر */}
      <polygon
        points="166,0 500,0 500,300 166,300 210,270 166,240 210,210 166,180 210,150 166,120 210,90 166,60 210,30 166,0"
        fill="#CE1126"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ═══════ الغلاف الرسمي ═══════ */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0d1b3e 0%, #1a2d5a 50%, #0d1b3e 100%)',
          color: '#fff',
          padding: '28px 20px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '4px solid #CE1126',
        }}
      >
        {/* زخرفة خلفية */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* علم البحرين */}
          <BahrainFlag size={64} />

          {/* مملكة البحرين */}
          <h2
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              fontWeight: 700,
              margin: 0,
              letterSpacing: 2,
              fontFamily: 'var(--font-cairo, "Cairo", sans-serif)',
              textShadow: '0 2px 8px rgba(0,0,0,.3)',
            }}
          >
            🇧🇭 مملكة البحرين 🇧🇭
          </h2>

          {/* وزارة التربية والتعليم */}
          <p
            style={{
              fontSize: 'clamp(15px, 3vw, 20px)',
              margin: 0,
              fontWeight: 600,
              color: '#f0c040',
              fontFamily: 'var(--font-cairo, "Cairo", sans-serif)',
              letterSpacing: 1,
            }}
          >
            وزارة التربية والتعليم
          </p>

          {/* خط فاصل زخرفي */}
          <div
            style={{
              width: 120,
              height: 2,
              background: 'linear-gradient(90deg, transparent, #f0c040, transparent)',
              margin: '4px 0',
            }}
          />

          {/* اسم المدرسة */}
          <h1
            style={{
              fontSize: 'clamp(16px, 3.5vw, 24px)',
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.6,
              fontFamily: 'var(--font-cairo, "Cairo", sans-serif)',
              textShadow: '0 1px 6px rgba(0,0,0,.2)',
            }}
          >
            مدرسة سمو الشيخ محمد بن خليفة
            <br />
            الابتدائية الإعدادية للبنين
          </h1>

          {/* خط فاصل زخرفي */}
          <div
            style={{
              width: 80,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)',
              margin: '2px 0',
            }}
          />

          {/* اسم المعلم */}
          <p
            style={{
              fontSize: 'clamp(13px, 2.5vw, 17px)',
              margin: 0,
              color: '#a8c4f0',
              fontFamily: 'var(--font-cairo, "Cairo", sans-serif)',
              fontWeight: 500,
            }}
          >
            إعداد: أ/ علاء إبراهيم
          </p>
        </div>
      </header>

      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px' }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '64px 0 48px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--muted)',
              fontFamily: 'var(--font-cairo)',
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            🎯 منصة تعليمية للمعلمين والطلاب العرب
          </div>
          <h1
            style={{
              fontSize: 'clamp(40px, 8vw, 72px)',
              lineHeight: 1.1,
              marginBottom: 20,
              background:
                'linear-gradient(135deg, var(--pink), var(--yellow), var(--green))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              animation: 'gradientShift 6s ease infinite',
            }}
          >
            مسابقات تفاعلية
            <br />
            تُحيي الفصل الدراسي
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--muted)',
              maxWidth: 600,
              margin: '0 auto 36px',
              lineHeight: 1.8,
            }}
          >
            أنشئ مسابقات حية، أطلق أسئلة ذكية، وشاهد طلابك يتفاعلون في الوقت الفعلي
            — نقاط، ترتيب لحظي، ومرح حقيقي.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
              ابدأ كمعلم ←
            </Link>
            <Link href="/join" className="btn-ghost" style={{ textDecoration: 'none' }}>
              دخول كطالب
            </Link>
          </div>
        </section>

        {/* Features */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginTop: 48,
          }}
        >
          {[
            {
              icon: '⚡',
              title: 'مسابقات مباشرة',
              body: 'رمز 6 أرقام + QR — الطلاب يدخلون خلال ثوانٍ من أي جهاز.',
            },
            {
              icon: '🤖',
              title: 'مولّد أسئلة ذكي',
              body: 'اكتب الموضوع، واحصل على أسئلة جاهزة بالدرجة الصعوبة المطلوبة.',
            },
            {
              icon: '🏆',
              title: 'ترتيب لحظي',
              body: 'منصّة Top 3، نقاط سرعة، ومنافسة حقيقية تحفّز الطلاب.',
            },
            {
              icon: '📊',
              title: 'تقارير للمعلم',
              body: 'أصعب الأسئلة، أضعف الطلاب، وتحليل لكل جلسة.',
            },
            {
              icon: '🎨',
              title: '٨ أنواع أسئلة',
              body: 'اختيار، صح/خطأ، ملء فراغ، مطابقة، ترتيب، وأكثر.',
            },
            {
              icon: '🔊',
              title: 'أصوات وحركة',
              body: 'عدّاد ينبض، أصوات نجاح وفشل، وتأثيرات confetti.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card-panel"
              style={{ animation: 'fadeIn .6s ease' }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', lineHeight: 1.7, fontSize: 14 }}>
                {f.body}
              </p>
            </div>
          ))}
        </section>

        {/* CTA strip */}
        <section
          className="card-panel"
          style={{
            marginTop: 64,
            textAlign: 'center',
            padding: 48,
            background:
              'linear-gradient(135deg, rgba(124,77,255,.15), rgba(255,51,102,.12))',
          }}
        >
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>
            جاهز تحوّل الفصل لساحة منافسة؟
          </h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            مجاني تمامًا — ابنِ أول مسابقة خلال دقائق.
          </p>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
            أنشئ حساب معلم →
          </Link>
        </section>

        {/* Footer */}
        <footer
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '48px 0 24px',
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} QuizArena — صُنع للمعلمين العرب 💚
        </footer>
      </main>
    </>
  );
}
