// sentence-test.js — AI-powered sentence validation and "learned" marking

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
      <div id="sentence-feedback" class="hidden"></div>
      <div class="test-actions">
        <button id="btn-skip-test" class="btn btn-secondary">Back to Cards</button>
        <button id="btn-submit-sentence" class="btn btn-primary">Submit</button>
      </div>
    </div>
  `;

  // Reveal definition toggle
  document.getElementById('btn-reveal-def').addEventListener('click', (e) => {
    const defEl = document.getElementById('test-definition');
    defEl.classList.toggle('hidden');
    e.target.textContent = defEl.classList.contains('hidden') ? 'Show definition' : 'Hide definition';
  });

  const input = document.getElementById('sentence-input');
  const feedbackEl = document.getElementById('sentence-feedback');
  const submitBtn = document.getElementById('btn-submit-sentence');

  input.focus();

  submitBtn.addEventListener('click', () => submitSentence(word, input, feedbackEl, submitBtn));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitSentence(word, input, feedbackEl, submitBtn);
    }
  });

  document.getElementById('btn-skip-test').addEventListener('click', () => {
    showView('flashcards');
    advanceCard();
  });
}

async function submitSentence(word, input, feedbackEl, submitBtn) {
  const sentence = input.value.trim();

  // Basic validation first
  if (!sentence) {
    showFeedback(feedbackEl, 'error', 'Please write a sentence.');
    return;
  }

  if (sentence.split(/\s+/).length < 4) {
    showFeedback(feedbackEl, 'error', 'Your sentence is too short. Write at least 4-5 words.');
    return;
  }

  // Check word is present (basic check)
  const wordParts = word.text.split(/\s+/);
  const wordPattern = new RegExp(
    wordParts.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'),
    'i'
  );
  if (!wordPattern.test(sentence)) {
    showFeedback(feedbackEl, 'error', `Your sentence must contain "${word.text}".`);
    return;
  }

  // If AI is available, do smart evaluation
  if (hasApiKey()) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'AI evaluating...';

    try {
      const result = await evaluateSentenceWithAI(word.text, word.definition, sentence);

      if (result.pass) {
        // Show brief AI feedback, then mark learned
        showAIFeedbackThenSuccess(word, sentence, result);
      } else {
        // Show AI feedback with corrections
        showAIFeedback(feedbackEl, result);
      }
    } catch (err) {
      // AI failed, fall back to basic validation
      updateWord(word.id, { status: 'learned', sentence });
      showSuccess(word.text);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  } else {
    // No AI: basic validation passes
    updateWord(word.id, { status: 'learned', sentence });
    showSuccess(word.text);
  }
}

function showFeedback(el, type, message) {
  el.className = `feedback feedback-${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function showAIFeedback(el, result) {
  el.className = 'feedback feedback-ai';
  el.classList.remove('hidden');

  let html = `<p class="feedback-text">${escapeHtml(result.feedback)}</p>`;

  if (result.corrected) {
    html += `<p class="feedback-corrected"><strong>Suggested:</strong> <em>${escapeHtml(result.corrected)}</em></p>`;
  }

  if (result.tip) {
    html += `<p class="feedback-tip">${escapeHtml(result.tip)}</p>`;
  }

  el.innerHTML = html;
}

function showAIFeedbackThenSuccess(word, sentence, result) {
  const container = document.getElementById('sentence-test-content');
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-check">&#10003;</div>
      <p class="success-text">You've learned "<strong>${escapeHtml(word.text)}</strong>"!</p>

      <div class="ai-feedback-card">
        <p class="feedback-text">${escapeHtml(result.feedback)}</p>
        ${result.corrected ? `<p class="feedback-corrected"><strong>Even better:</strong> <em>${escapeHtml(result.corrected)}</em></p>` : ''}
        ${result.tip ? `<p class="feedback-tip">${escapeHtml(result.tip)}</p>` : ''}
      </div>

      <div class="success-actions">
        <button id="btn-continue" class="btn btn-primary">Continue Reviewing</button>
        <button id="btn-test-more" class="btn btn-secondary">Test Another Word</button>
      </div>
    </div>
  `;

  updateWord(word.id, { status: 'learned', sentence });

  document.getElementById('btn-continue').addEventListener('click', () => {
    showView('flashcards');
    loadDeck();
    renderCard(getCurrentCard());
  });

  document.getElementById('btn-test-more').addEventListener('click', () => {
    showTestQueue();
  });
}

function showSuccess(word) {
  const container = document.getElementById('sentence-test-content');
  container.innerHTML = `
    <div class="success-screen">
      <div class="success-check">&#10003;</div>
      <p class="success-text">You've learned "<strong>${escapeHtml(word)}</strong>"!</p>
      <div class="success-actions">
        <button id="btn-continue" class="btn btn-primary">Continue Reviewing</button>
        <button id="btn-test-more" class="btn btn-secondary">Test Another Word</button>
      </div>
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
