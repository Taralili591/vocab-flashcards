// flashcard.js — Card rendering, flip animation, swipe gestures

let currentDeck = [];
let currentIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let isDragging = false;

function loadDeck() {
  const newWords = getWordsByStatus('new');
  const reviewing = getWordsByStatus('reviewing');
  // Shuffle for variety
  currentDeck = shuffleArray([...newWords, ...reviewing]);
  currentIndex = 0;
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCurrentCard() {
  return currentDeck[currentIndex] || null;
}

function renderCard(word) {
  const container = document.getElementById('card-container');
  container.innerHTML = '';

  if (!word) {
    const learnedCount = getWordsByStatus('learned').length;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-text">&#10003;</div>
        <p>All caught up!</p>
        <p class="empty-hint">${learnedCount} words learned. Add more or revisit later.</p>
      </div>
    `;
    updateCardCounter();
    return;
  }

  const card = document.createElement('div');
  card.className = 'flashcard';
  card.innerHTML = `
    <div class="flashcard-inner">
      <div class="flashcard-front">
        <span class="card-word">${escapeHtml(word.text)}</span>
        ${word.phonetic ? `<span class="card-phonetic">${escapeHtml(word.phonetic)}</span>` : ''}
        <span class="card-hint">Tap to see definition</span>
      </div>
      <div class="flashcard-back">
        <span class="card-word-small">${escapeHtml(word.text)}</span>
        <div class="card-definition">${word.definition ? escapeHtml(word.definition).replace(/\n/g, '<br>') : '<em>Definition loading...</em>'}</div>
        <span class="card-hint-back">Swipe left = don\'t know · Swipe right = know</span>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (!isDragging) {
      card.classList.toggle('flipped');
    }
  });

  initSwipeGestures(card);
  container.appendChild(card);
  updateCardCounter();
}

function updateCardCounter() {
  const counter = document.getElementById('card-counter');
  if (!counter) return;
  const remaining = currentDeck.length - currentIndex;
  const learned = getWordsByStatus('learned').length;
  counter.textContent = remaining > 0
    ? `${currentIndex + 1} / ${currentDeck.length}`
    : `${learned} words learned`;
}

function initSwipeGestures(cardElement) {
  // Touch support
  cardElement.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    isDragging = false;
    cardElement.style.transition = 'none';
  }, { passive: true });

  cardElement.addEventListener('touchmove', (e) => {
    touchCurrentX = e.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isDragging = true;
      e.preventDefault();
      const rotation = deltaX * 0.1;
      cardElement.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

      // Show swipe indicator
      cardElement.classList.remove('swipe-left-hint', 'swipe-right-hint');
      if (Math.abs(deltaX) > 60) {
        cardElement.classList.add(deltaX > 0 ? 'swipe-right-hint' : 'swipe-left-hint');
      }
    }
  }, { passive: false });

  cardElement.addEventListener('touchend', () => {
    const deltaX = touchCurrentX - touchStartX;
    cardElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    if (Math.abs(deltaX) > 80) {
      const direction = deltaX > 0 ? 1 : -1;
      cardElement.style.transform = `translateX(${direction * 500}px) rotate(${direction * 30}deg)`;
      cardElement.style.opacity = '0';

      setTimeout(() => {
        if (deltaX > 0) {
          onSwipeRight();
        } else {
          onSwipeLeft();
        }
      }, 200);
    } else {
      cardElement.style.transform = '';
      cardElement.classList.remove('swipe-left-hint', 'swipe-right-hint');
    }

    setTimeout(() => { isDragging = false; }, 50);
  });

  // Mouse support for desktop
  let mouseDown = false;
  cardElement.addEventListener('mousedown', (e) => {
    mouseDown = true;
    touchStartX = e.clientX;
    touchCurrentX = touchStartX;
    isDragging = false;
    cardElement.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    touchCurrentX = e.clientX;
    const deltaX = touchCurrentX - touchStartX;
    if (Math.abs(deltaX) > 10) {
      isDragging = true;
      const rotation = deltaX * 0.1;
      cardElement.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

      cardElement.classList.remove('swipe-left-hint', 'swipe-right-hint');
      if (Math.abs(deltaX) > 60) {
        cardElement.classList.add(deltaX > 0 ? 'swipe-right-hint' : 'swipe-left-hint');
      }
    }
  });

  document.addEventListener('mouseup', () => {
    if (!mouseDown) return;
    mouseDown = false;
    const deltaX = touchCurrentX - touchStartX;
    cardElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    if (Math.abs(deltaX) > 80) {
      const direction = deltaX > 0 ? 1 : -1;
      cardElement.style.transform = `translateX(${direction * 500}px) rotate(${direction * 30}deg)`;
      cardElement.style.opacity = '0';
      setTimeout(() => {
        if (deltaX > 0) onSwipeRight();
        else onSwipeLeft();
      }, 200);
    } else {
      cardElement.style.transform = '';
      cardElement.classList.remove('swipe-left-hint', 'swipe-right-hint');
    }
    setTimeout(() => { isDragging = false; }, 50);
  });
}

// Swipe LEFT = don't know → mark as reviewing, next card
function onSwipeLeft() {
  const word = getCurrentCard();
  if (word) {
    updateWord(word.id, { status: 'reviewing' });
  }
  advanceCard();
}

// Swipe RIGHT = know it → mark as reviewing (needs sentence test to become "learned")
function onSwipeRight() {
  const word = getCurrentCard();
  if (word) {
    // Mark as reviewing — user must pass sentence test to fully learn
    updateWord(word.id, { status: 'reviewing' });
    showView('sentence-test');
    showSentenceTest(word);
    return;
  }
  advanceCard();
}

function advanceCard() {
  currentIndex++;
  if (currentIndex >= currentDeck.length) {
    loadDeck();
  }
  renderCard(getCurrentCard());
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function initFlashcards() {
  loadDeck();
  renderCard(getCurrentCard());
}
