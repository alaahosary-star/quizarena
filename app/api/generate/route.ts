import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, subject, grade, difficulty, count, questionTypes, extraInstructions } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const difficultyMap: Record<string, string> = {
      easy: 'سهل — مناسب للطلاب الأضعف أو للمراجعة السريعة',
      medium: 'متوسط — يناسب المستوى الأساسي للصف',
      hard: 'صعب — يتحدى الطلاب المتميزين ويتطلب تفكيرًا عميقًا',
    };

    const typesDesc = (questionTypes as string[])
      .map((t: string) => ({ mcq: 'اختيار من متعدد (4 خيارات)', true_false: 'صح / خطأ (خياران)', fill_blank: 'أكمل الفراغ (إجابة نصية واحدة)' }[t]))
      .filter(Boolean)
      .join('، ');

    const prompt = `أنت خبير تربوي متخصص في بناء الاختبارات الإلكترونية للمناهج العربية.

**المطلوب:** توليد ${count} سؤال تعليمي عن: **${topic}**

**معلومات:**
- المادة: ${subject}
- الصف: ${grade}
- المستوى: ${difficultyMap[difficulty] ?? difficulty}
- أنواع الأسئلة المطلوبة: ${typesDesc}
${extraInstructions ? `- تعليمات إضافية: ${extraInstructions}` : ''}

**تعليمات مهمة:**
1. وزّع الأسئلة على الأنواع المطلوبة بشكل متوازن
2. اجعل الأسئلة واضحة وباللغة العربية الفصحى
3. تأكد أن كل سؤال له إجابة صحيحة واحدة فقط
4. للأسئلة من نوع mcq: اجعل الخيارات الخاطئة معقولة
5. للأسئلة من نوع true_false: اجعلها تتطلب فهمًا لا مجرد تخمين

**أعد JSON فقط، بدون أي نص آخر أو markdown، بهذا الشكل بالضبط:**
{
  "questions": [
    {
      "question_text": "نص السؤال",
      "question_type": "mcq",
      "time_limit": 30,
      "points": 1000,
      "speed_bonus": true,
      "explanation": "شرح مختصر للإجابة الصحيحة",
      "choices": [
        { "choice_text": "نص الخيار", "is_correct": true },
        { "choice_text": "نص الخيار", "is_correct": false },
        { "choice_text": "نص الخيار", "is_correct": false },
        { "choice_text": "نص الخيار", "is_correct": false }
      ]
    }
  ]
}

- لـ mcq: 4 خيارات (واحد صحيح)
- لـ true_false: خياران: "صح" و"خطأ"
- لـ fill_blank: خيار واحد is_correct=true يحتوي الإجابة النموذجية
- time_limit: 20 للسهل، 30 للمتوسط، 45-60 للصعب
- points: 500 للسهل، 1000 للمتوسط، 1500-2000 للصعب

أعد JSON فقط بدون أي نص إضافي.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }

    // Strip potential markdown fences
    const jsonStr = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response structure from AI');
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Generate API error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
