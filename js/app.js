// app.js — App initialization, view routing, event wiring

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  setupNavigation();
  setupImport();
  setupManualEntry();
  setupSearch();

  if (hasImported()) {
    showWordControls();
    renderWordList();
    fetchMissingDefinitions();
  }

  showView('words');
}

// ─── Navigation ───

function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      showView(view);
      if (view === 'flashcards') {
        loadDeck();
        renderCard(getCurrentCard());
      }
      if (view === 'words') renderWordList();
      if (view === 'sentence-test') showTestQueue();
    });
  });
}

function showView(viewName) {
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.view === viewName);
  });

  updateBadges();
}

function updateBadges() {
  const newCount = getWordsByStatus('new').length + getWordsByStatus('reviewing').length;
  const learnedCount = getWordsByStatus('learned').length;
  const totalCount = getWords().length;

  const cardBadge = document.getElementById('badge-cards');
  const learnedBadge = document.getElementById('badge-learned');
  const wordsBadge = document.getElementById('badge-words');

  if (cardBadge) cardBadge.textContent = newCount || '';
  if (learnedBadge) learnedBadge.textContent = learnedCount || '';
  if (wordsBadge) wordsBadge.textContent = totalCount || '';
}

// ─── Import ───

function setupImport() {
  const btn = document.getElementById('btn-import');
  if (!btn) return;

  btn.addEventListener('click', handleImport);
}

async function handleImport() {
  const btn = document.getElementById('btn-import');
  const progress = document.getElementById('import-progress');
  const progressText = document.getElementById('import-progress-text');
  const progressBar = document.getElementById('import-progress-bar');

  btn.disabled = true;
  btn.textContent = 'Loading words...';

  try {
    const response = await fetch('data/words.json');
    const wordList = await response.json();

    bulkAddWords(wordList);

    btn.textContent = 'Imported! Fetching definitions...';
    progress.classList.remove('hidden');

    await fetchDefinitionsInBatches(progressText, progressBar);

    progress.classList.add('hidden');
    showWordControls();
    renderWordList();
    showNotification(`${wordList.length} words imported!`);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Import All Words';
    showError('Failed to import words: ' + err.message);
  }
}

function showWordControls() {
  const prompt = document.getElementById('import-prompt');
  const controls = document.getElementById('words-controls');
  const manual = document.getElementById('manual-section');
  const subtitle = document.getElementById('words-subtitle');

  if (prompt) prompt.classList.add('hidden');
  if (controls) controls.classList.remove('hidden');
  if (manual) manual.classList.remove('hidden');

  const total = getWords().length;
  if (subtitle) subtitle.textContent = `${total} words in your collection`;
}

async function fetchDefinitionsInBatches(progressText, progressBar) {
  const words = getWordsWithoutDefinition();
  const total = words.length;
  if (total === 0) return;

  const BATCH_SIZE = 5;

  for (let i = 0; i < total; i++) {
    const word = words[i];
    const { definition, phonetic } = await fetchDefinition(word.text);

    if (definition !== 'Definition not found') {
      updateWord(word.id, { definition, phonetic });
    }

    const done = i + 1;
    const pct = Math.round((done / total) * 100);
    if (progressText) progressText.textContent = `Fetching definitions... ${done}/${total}`;
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (i < total - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

async function fetchMissingDefinitions() {
  const missing = getWordsWithoutDefinition();
  if (missing.length === 0) return;

  const progress = document.getElementById('import-progress');
  const progressText = document.getElementById('import-progress-text');
  const progressBar = document.getElementById('import-progress-bar');

  if (progress) progress.classList.remove('hidden');
  await fetchDefinitionsInBatches(progressText, progressBar);
  if (progress) progress.classList.add('hidden');
}

// ─── Search & Filter ───

let currentFilter = 'all';
let currentSearch = '';

function setupSearch() {
  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderWordList();
    });
  }

  document.querySelectorAll('.pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      renderWordList();
    });
  });
}

// ─── Manual Entry ───

function setupManualEntry() {
  const input = document.getElementById('manual-word-input');
  const btn = document.getElementById('btn-add-manual');
  if (!input || !btn) return;

  btn.addEventListener('click', () => addManualWord(input));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addManualWord(input);
  });
}

async function addManualWord(input) {
  const word = input.value.trim().toLowerCase();
  if (!word) return;

  const existing = getWords().find((w) => w.text === word);
  if (existing) {
    showError(`"${word}" is already in your list.`);
    return;
  }

  input.disabled = true;
  const { definition, phonetic } = await fetchDefinition(word);
  addWord({ text: word, definition, phonetic });
  input.value = '';
  input.disabled = false;
  input.focus();

  showNotification(`"${word}" added!`);
  renderWordList();
  updateBadges();
}

// ─── Word List ───

function renderWordList() {
  const list = document.getElementById('word-list');
  if (!list) return;

  const allWords = getWords();
  list.innerHTML = '';

  // Update stats
  const newCount = allWords.filter((w) => w.status === 'new').length;
  const reviewCount = allWords.filter((w) => w.status === 'reviewing').length;
  const learnedCount = allWords.filter((w) => w.status === 'learned').length;

  const statTotal = document.getElementById('stat-total');
  const statNew = document.getElementById('stat-new');
  const statReviewing = document.getElementById('stat-reviewing');
  const statLearned = document.getElementById('stat-learned');

  if (statTotal) statTotal.textContent = `${allWords.length} total`;
  if (statNew) statNew.textContent = `${newCount} new`;
  if (statReviewing) statReviewing.textContent = `${reviewCount} learning`;
  if (statLearned) statLearned.textContent = `${learnedCount} learned`;

  // Filter
  let filtered = allWords;
  if (currentFilter !== 'all') {
    filtered = filtered.filter((w) => w.status === currentFilter);
  }
  if (currentSearch) {
    filtered = filtered.filter((w) => w.text.includes(currentSearch));
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-hint">No words match your filter.</p>';
    updateBadges();
    return;
  }

  // Render compact list
  filtered.forEach((w) => {
    const item = document.createElement('div');
    item.className = `word-item word-item-${w.status}`;
    const statusDot = w.status === 'learned' ? 'dot-learned'
      : w.status === 'reviewing' ? 'dot-reviewing'
      : 'dot-new';

    item.innerHTML = `
      <div class="word-item-left">
        <span class="status-dot ${statusDot}"></span>
        <span class="word-text">${escapeHtml(w.text)}</span>
      </div>
      <span class="word-def-preview">${w.definition ? escapeHtml(w.definition.split('\n')[0].slice(0, 50)) : '...'}</span>
    `;

    item.addEventListener('click', () => showWordDetail(w));
    list.appendChild(item);
  });

  updateBadges();
}

function showWordDetail(word) {
  const list = document.getElementById('word-list');
  const existing = document.querySelector('.word-detail-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'word-detail-modal';
  modal.innerHTML = `
    <div class="word-detail-card">
      <button class="detail-close">&times;</button>
      <h2 class="detail-word">${escapeHtml(word.text)}</h2>
      ${word.phonetic ? `<p class="detail-phonetic">${escapeHtml(word.phonetic)}</p>` : ''}
      <div class="detail-definition">${word.definition ? escapeHtml(word.definition).replace(/\n/g, '<br>') : '<em>No definition yet</em>'}</div>
      ${word.sentence ? `<p class="detail-sentence">"${escapeHtml(word.sentence)}"</p>` : ''}
      <div class="detail-status">Status: <span class="badge badge-${word.status}">${word.status}</span></div>
      <div class="detail-actions">
        <button class="btn btn-secondary btn-delete-word" data-id="${word.id}">Delete</button>
      </div>
    </div>
  `;

  modal.querySelector('.detail-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  modal.querySelector('.btn-delete-word').addEventListener('click', () => {
    deleteWord(word.id);
    modal.remove();
    renderWordList();
  });

  document.body.appendChild(modal);
}

// ─── Test Queue ───

function showTestQueue() {
  const container = document.getElementById('sentence-test-content');
  const reviewing = getWordsByStatus('reviewing');

  if (reviewing.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-text">?</div>
        <p>No words ready for testing</p>
        <p class="empty-hint">Swipe right on flashcards to mark words you know, then test yourself here.</p>
      </div>
    `;
    return;
  }

  // Pick a random word from reviewing
  const word = reviewing[Math.floor(Math.random() * reviewing.length)];
  showSentenceTest(word);
}

// ─── Notifications ───

function showError(msg) {
  showNotification(msg, 'error');
}

function showNotification(msg, type = 'success') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `notification notification-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
