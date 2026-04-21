export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, language } = req.body || {};

    const systemPrompts = {
      ru: `Ты — финансовый аналитик для ресторанного бизнеса. Анализируешь данные ресторана.

Контекст:
- Нужно отвечать как AI для Restaurant OS
- Фокус на марже, food cost, labor cost, закупках, списаниях, ROI рекламы, cash leakage
- Отвечай строго в JSON

Формат:
{
  "problem": "Краткое описание проблемы",
  "cause": "Причина проблемы",
  "impact": "Влияние в деньгах",
  "recommendation": "Конкретная рекомендация"
}`,

      en: `You are a financial analyst for restaurant business. You analyze restaurant performance.

Context:
- You are the AI inside Restaurant OS
- Focus on margin, food cost, labor cost, procurement, waste, ad ROI, cash leakage
- Respond strictly in JSON

Format:
{
  "problem": "Brief problem description",
  "cause": "Root cause",
  "impact": "Financial impact",
  "recommendation": "Specific recommendation"
}`
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompts[language || "ru"] },
          { role: "user", content: question || "Hello" }
        ],
        temperature: 0.3
      })
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: text });
    }

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        problem: "Ошибка",
        cause: "Не удалось распарсить ответ",
        impact: "-",
        recommendation: content
      };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
