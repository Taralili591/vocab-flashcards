// sentence-test.js — Sentence validation and "learned" marking

function showSentenceTest(word) {
  const container = document.getElementById('sentence-test-content');
  container.innerHTML = `
    <div class="test-card stagger-1">
      <div class="test-word">${escapeHtml(word.text)}</div>
      ${word.phonetic ? `<p class="test-phonetic">${escapeHtml(word.phonetic)}</p>` : ''}
      <button class="btn btn-reveal" id="btn-reveal-def">Show definition</button>
      <div id="test-definition" class="test-definition hidden">
        ${word.definition ? escapeHtml(word.definition).replace(/\n/g, '<br>') : '<em>No definition available</em>'}
      </div>
    </div>

    <div class="test-input-area stagger-2">
      <p class="test-prompt">Write a sentence using "<strong>${escapeHtml(word.text)}</strong>":</p>
      <textarea id="sentence-input" placeholder="Type your sentence here..." rows="3" autocomplete="off" autocorrect="off" spellcheck="true"></textarea>
      <div id="sentence-error" class="error-msg hidden"></div>
      <div class="test-actions">
        <button id="btn-skip-test" class="btn btn-secondary">Back to Cards</button>
        <button id="btn-submit-sentence" class="btn btn-primary">Submit</button>
      </div>
    </div>
  `;

  // Reveal definition on button click
  document.getElementById('btn-reveal-def').addEventListener('click', (e) => {
    const defEl = document.getElementById('test-definition');
    defEl.classList.toggle('hidden');
    e.target.textContent = defEl.classList.contains('hidden') ? 'Show definition' : 'Hide definition';
  });

  const input = document.getElementById('sentence-input');
  const errorEl = document.getElementById('sentence-error');

  input.focus();

  document.getElementById('btn-submit-sentence').addEventListener('click', () => {
    const result = validateSentence(input.value, word.text);
    if (result.valid) {
      updateWord(word.id, { status: 'learned', sentence: input.value.trim() });
      showSuccess(word.text);
    } else {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('btn-submit-sentence').click();
    }
  });

  document.getElementById('btn-skip-test').addEventListener('click', () => {
    showView('flashcards');
    advanceCard();
  });
}

function validateSentence(sentence, word) {
  const trimmed = sentence.trim();

  if (!trimmed) {
    return { valid: false, error: 'Please write a sentence.' };
  }

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 5) {
    return { valid: false, error: 'Your sentence is too short. Please write at least 5 words.' };
  }

  // Handle multi-word entries like "set fire"
  const wordPattern = new RegExp(
    word.split(/\s+/).map((w) => `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).join('\\s+'),
    'i'
  );
  if (!wordPattern.test(trimmed)) {
    return { valid: false, error: `Your sentence must contain "${word}".` };
  }

  return { valid: true, error: '' };
}

function showSuccess(word) {
  const container = document.getElementById('sentence-test-content');
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-check">&#10003;</div>
      <p class="success-text">You've learned "<strong>${escapeHtml(word)}</strong>"!</p>
      <button id="btn-continue" class="btn btn-primary">Continue Reviewing</button>
      <button id="btn-test-more" class="btn btn-secondary">Test Another Word</button>
    </div>
  `;

  document.getElementById('btn-continue').addEventListener('click', () => {
    showView('flashcards');
    loadDeck();
    renderCard(getCurrentCard());
  });

  document.getElementById('btn-test-more').addEventListener('click', () => {
    showTestQueue();
  });
}
