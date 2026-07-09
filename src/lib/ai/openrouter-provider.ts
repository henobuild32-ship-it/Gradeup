interface OpenRouterInput {
  message: string;
  schoolContext: string;
  userName: string;
  userRole: string;
  historyMessages: { role: string; content: string }[];
  systemPrompt: string;
}

export async function generateOpenRouterResponse(input: OpenRouterInput): Promise<Response> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';

  const messages = [
    { role: 'system', content: input.systemPrompt },
    ...input.historyMessages,
    { role: 'user', content: input.message },
  ];

  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://gradeup.vercel.app',
      'X-Title': 'GradeUp',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
      messages,
    }),
  });
}