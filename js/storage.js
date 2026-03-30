// storage.js — localStorage CRUD for vocabulary words (immutable patterns)

const STORAGE_KEY = 'vocab_words';
const IMPORT_FLAG_KEY = 'vocab_imported';

function getWords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function addWord(wordObj) {
  const words = getWords();
  const exists = words.some(
    (w) => w.text.toLowerCase() === wordObj.text.toLowerCase()
  );
  if (exists) return words;

  const newWord = {
    id: crypto.randomUUID(),
    text: wordObj.text.toLowerCase().trim(),
    definition: wordObj.definition || '',
    phonetic: wordObj.phonetic || '',
    status: 'new',
    sentence: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [...words, newWord];
  saveWords(updated);
  return updated;
}

function bulkAddWords(wordTexts) {
  const existing = getWords();
  const existingSet = new Set(existing.map((w) => w.text.toLowerCase()));

  const newWords = wordTexts
    .filter((t) => !existingSet.has(t.toLowerCase().trim()))
    .map((text) => ({
      id: crypto.randomUUID(),
      text: text.toLowerCase().trim(),
      definition: '',
      phonetic: '',
      status: 'new',
      sentence: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

  const updated = [...existing, ...newWords];
  saveWords(updated);
  localStorage.setItem(IMPORT_FLAG_KEY, 'true');
  return updated;
}

function updateWord(id, changes) {
  const words = getWords();
  const updated = words.map((w) =>
    w.id === id
      ? { ...w, ...changes, updatedAt: new Date().toISOString() }
      : w
  );
  saveWords(updated);
  return updated;
}

function deleteWord(id) {
  const words = getWords();
  const updated = words.filter((w) => w.id !== id);
  saveWords(updated);
  return updated;
}

function getWordsByStatus(status) {
  return getWords().filter((w) => w.status === status);
}

function hasImported() {
  return localStorage.getItem(IMPORT_FLAG_KEY) === 'true';
}

function getWordsWithoutDefinition() {
  return getWords().filter((w) => !w.definition);
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(IMPORT_FLAG_KEY);
  return [];
}
