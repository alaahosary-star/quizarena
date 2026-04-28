import { NextRequest, NextResponse } from 'next/server';

/* ─── helper: wait ms ─── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ─── Generate ONE question from Gemini ─── */
async function generateOneQuestion(
  apiKey: string,
  topic: string,
  subject: string,
  grade: string,
  difficulty: string,
  questionType: string,
  difficultyDesc: string,
  index: number,
  total: number,
  extraInstructions?: string
) {
  const typeDesc: Record<string, string> = {
    mcq: 'اختيار من متعدد (4 خيارات — واحد صحيح و3 خاطئة)',
    true_false: 'صح / خطأ (خياران فقط: "صح" و"خطأ")',
    fill_blank: 'أكمل الفراغ (إجابة نصية واحدة)',
  };

  const prompt = `أنت خبير تربوي متخصص في بناء الاختبارات الإلكترونية للمناهج العربية.

**المطلوب:** توليد سؤال واحد فقط (السؤال رقم ${index + 1} من ${total}) عن: **${topic}**

**معلومات:**
- المادة: ${subject}
- الصف: ${grade}
- المستوى: ${difficultyDesc}
- نوع السؤال المطلوب: ${typeDesc[questionType] ?? questionType}
${extraInstructions ? `- تعليمات إضافية: ${extraInstructions}` : ''}

**تعليمات مهمة:**
1. اجعل السؤال واضح وباللغة العربية الفصحى
2. تأكد أن له إجابة صحيحة واحدة فقط
3. للأسئلة mcq: اجعل الخيارات الخاطئة معقولة ومختلفة عن بعض
4. للأسئلة true_false: اجعلها تتطلب فهمًا لا مجرد تخمين
5. اجعل السؤال مختلف ومتنوع — لا تكرر نفس الفكرة

**أعد JSON فقط، بدون أي نص آخر أو markdown، بهذا الشكل بالضبط:**
{
  "question_text": "نص السؤال",
  "question_type": "${questionType}",
  "time_limit": ${difficulty === 'easy' ? 20 : difficulty === 'medium' ? 30 : 45},
  "points": ${difficulty === 'easy' ? 500 : difficulty === 'medium' ? 1000 : 1500},
  "speed_bonus": true,
  "explanation": "شرح مختصر للإجابة الصحيحة",
  "choices": [
    { "choice_text": "نص الخيار", "is_correct": true },
    { "choice_text": "نص الخيار", "is_correct": false }
  ]
}

ملاحظات:
- لـ mcq: 4 خيارات بالضبط (واحد صحيح)
- لـ true_false: خياران فقط: "صح" و"خطأ"
- لـ fill_blank: خيار واحد فقط is_correct=true يحتوي الإجابة النموذجية

أعد JSON فقط بدون أي نص إضافي.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini error for question ${index + 1}: ${errMsg}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    throw new Error(`Empty response for question ${index + 1}`);
  }

  const jsonStr = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(jsonStr);
}

/* ─── Main API Route ─── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, subject, grade, difficulty, count, questionTypes, extraInstructions } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const difficultyMap: Record<string, string> = {
      easy: 'سهل — مناسب للطلاب الأضعف أو للمراجعة السريعة',
      medium: 'متوسط — يناسب المستوى الأساسي للصف',
      hard: 'صعب — يتحدى الطلاب المتميزين ويتطلب تفكيرًا عميقًا',
    };
    const difficultyDesc = difficultyMap[difficulty] ?? difficulty;

    const totalCount = Number(count) || 5;
    const types = questionTypes as string[];

    // Distribute question types evenly
    const typeList: string[] = [];
    for (let i = 0; i < totalCount; i++) {
      typeList.push(types[i % types.length]);
    }

    const questions = [];
    const errors: string[] = [];

    for (let i = 0; i < totalCount; i++) {
      // ───── Wait 4 seconds between questions (not before the first) ─────
      if (i > 0) {
        await sleep(4000);
      }

      // Retry up to 2 times per question
      let success = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const q = await generateOneQuestion(
            apiKey,
            topic,
            subject,
            grade,
            difficulty,
            typeList[i],
            difficultyDesc,
            i,
            totalCount,
            extraInstructions
          );
          questions.push(q);
          success = true;
          break;
        } catch (err) {
          console.error(`Question ${i + 1}, attempt ${attempt + 1} failed:`, err);
          if (attempt === 0) {
            // Wait extra 5 seconds before retry
            await sleep(5000);
          }
        }
      }

      if (!success) {
        errors.push(`فشل توليد السؤال رقم ${i + 1}`);
      }
    }

    // Return whatever we got (even partial results)
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'فشل توليد جميع الأسئلة. جرّب مرة ثانية بعد دقيقة.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      questions,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (err: unknown) {
    console.error('Generate API error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
