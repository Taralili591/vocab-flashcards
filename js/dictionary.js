// dictionary.js — Free Dictionary API client

const DICT_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

async function fetchDefinition(word) {
  try {
    const response = await fetch(`${DICT_API_BASE}/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { definition: 'Definition not found', phonetic: '' };
    }

    const data = await response.json();
    const entry = data[0];

    const phonetic =
      entry.phonetic ||
      (entry.phonetics && entry.phonetics.find((p) => p.text)?.text) ||
      '';

    const meanings = entry.meanings || [];
    const definitions = meanings
      .slice(0, 3)
      .map((m) => {
        const def = m.definitions[0];
        const example = def.example ? ` (e.g. "${def.example}")` : '';
        return `[${m.partOfSpeech}] ${def.definition}${example}`;
      })
      .join('\n');

    return {
      definition: definitions || 'Definition not found',
      phonetic,
    };
  } catch {
    return { definition: 'Definition not found', phonetic: '' };
  }
}

async function fetchDefinitions(words, onProgress) {
  const results = [];
  for (let i = 0; i < words.length; i++) {
    const result = await fetchDefinition(words[i]);
    results.push({ word: words[i], ...result });
    if (onProgress) onProgress(i + 1, words.length);
    if (i < words.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return results;
}
