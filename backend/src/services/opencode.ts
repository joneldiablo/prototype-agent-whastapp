const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || '';
const OPENCODE_BASE_URL = 'https://opencode.ai/zen/v1';

interface OpenCodeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

export async function chatWithBigPickle(
  userMessage: string,
  systemPrompt?: string
): Promise<string> {
  const messages: OpenCodeMessage[] = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: userMessage });
  
  const response = await fetch(`${OPENCODE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCODE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'big-pickle',
      messages,
      temperature: 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenCode API error: ${response.status} - ${error}`);
  }
  
  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content || 'No se recibió respuesta';
}

export function isOpenCodeConfigured(): boolean {
  return OPENCODE_API_KEY.length > 0;
}