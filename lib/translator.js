const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

const LANGUAGES = [
  'Auto-detect',
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Turkish',
  'Polish',
  'Swedish',
  'Danish',
  'Norwegian',
  'Finnish',
  'Greek',
  'Hebrew',
  'Czech',
  'Romanian',
  'Hungarian',
  'Ukrainian',
  'Vietnamese',
  'Thai',
  'Indonesian',
];

async function translateText(apiKey, text, sourceLang, targetLang) {
  if (!text || !text.trim()) return '';

  const sourceDesc =
    sourceLang === 'Auto-detect'
      ? 'the source language (detect it automatically)'
      : sourceLang;

  const systemPrompt =
    `You are a professional literary translator. Translate the user's text from ` +
    `${sourceDesc} to ${targetLang}. Preserve paragraph breaks and formatting as ` +
    `closely as possible. Output only the translated text, with no commentary, ` +
    `notes, or explanations.`;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

module.exports = { translateText, LANGUAGES };
