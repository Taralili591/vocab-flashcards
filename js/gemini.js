// gemini.js — Google Gemini API client for vocabulary AI features

const GEMINI_KEY_STORAGE = 'gemini_api_key';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

function getApiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
}

function saveApiKey(key) {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

function hasApiKey() {
  return getApiKey().length > 0;
}

function clearApiKey() {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
}

async function callGemini(prompt, options = {}) {
  const key = getApiKey();
  if (!key) {
    throw new Error('No API key configured. Please add your Gemini API key in Settings.');
  }

  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 2048;

  const response = await fetch(
    `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `API error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

// ─── Batch definitions ───

async function fetchDefinitionsWithGemini(words, onProgress) {
  const BATCH_SIZE = 15;
  const results = [];

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const batch = words.slice(i, i + BATCH_SIZE);
    const wordList = batch.map((w) => w.text).join(', ');

    const prompt = `You are an English vocabulary tutor for a Chinese learner.
For each word below, provide:
1. Phonetic transcription (IPA)
2. Part of speech
3. A clear, concise English definition (1-2 sentences)
4. One natural example sentence

Words: ${wordList}

Respond in this exact JSON format (no markdown, no code fences):
[{"word":"example","phonetic":"/ɪɡˈzæmpəl/","definition":"[noun] A thing characteristic of its kind. Used to illustrate a rule.","example":"This painting is a fine example of Impressionism."}]`;

    try {
      const raw = await callGemini(prompt, { temperature: 0.2, maxTokens: 3000 });
      // Extract JSON from response (handle possible markdown fences)
      const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      parsed.forEach((item) => {
        results.push({
          word: item.word?.toLowerCase() || '',
          definition: item.definition || '',
          phonetic: item.phonetic || '',
          example: item.example || '',
        });
      });
    } catch (err) {
      console.error('[Gemini] Batch error:', err.message);
      // Fallback: add words without definitions
      batch.forEach((w) => {
        results.push({ word: w.text, definition: '', phonetic: '', example: '' });
      });
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, words.length), words.length);
    }

    // Rate limit: small delay between batches
    if (i + BATCH_SIZE < words.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}

// ─── AI sentence evaluation ───

async function evaluateSentenceWithAI(word, definition, sentence) {
  const prompt = `You are an English tutor evaluating a Chinese student's sentence.

Word: "${word}"
Definition: ${definition || '(no definition available)'}
Student's sentence: "${sentence}"

Evaluate:
1. Does the sentence use "${word}" correctly and in the right context?
2. Is the grammar correct?
3. Does the sentence show understanding of the word's meaning?

Respond in this exact JSON format (no markdown, no code fences):
{
  "pass": true or false,
  "feedback": "Brief encouraging feedback in English (1-2 sentences). If wrong, explain what's incorrect and give a hint.",
  "corrected": "Only if grammar/usage is wrong, provide the corrected sentence. Otherwise null.",
  "tip": "A short usage tip about this word (1 sentence)."
}`;

  const raw = await callGemini(prompt, { temperature: 0.2, maxTokens: 500 });
  const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(jsonStr);
}

// ─── Single word definition ───

async function fetchDefinitionWithGemini(word) {
  const prompt = `Define the English word "${word}" for a Chinese learner.
Respond in this exact JSON format (no markdown, no code fences):
{"phonetic":"/...IPA.../","definition":"[part of speech] Clear definition.","example":"Example sentence."}`;

  try {
    const raw = await callGemini(prompt, { temperature: 0.2, maxTokens: 400 });
    const jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      definition: parsed.definition || 'Definition not found',
      phonetic: parsed.phonetic || '',
      example: parsed.example || '',
    };
  } catch {
    return { definition: 'Definition not found', phonetic: '', example: '' };
  }
}
